import { useHost } from '@tugen/sdk';
import { useEffect, useRef, useState } from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  DEFAULT_SERVER_FILTERS,
  BuildError,
  parseServerPage,
  serverPageUrl,
  type Build,
  type MinecraftServer,
  type ServerFilters,
} from '../core';
import {
  useBuilds,
  useCore,
  useLaunchState,
  useMainBuildId,
} from '../core/react';
import { useT } from '../i18n';
import { Field, controlStyles } from '../ui/controls';
import { GravityIcon } from '../ui/icon';
import { GLOW_CYAN, GLOW_CYAN_FILL, GLOW_NEUTRAL } from '../ui/glow';
import { GlowButton, GlowText } from '../ui/glow-button';
import { colors } from '../ui/theme';
import { errorText, isBusy, phaseText } from './labels';
import {
  CATEGORY_FALLBACK,
  LICENSE_OPTIONS,
  ONLINE_OPTIONS,
  PAY_TO_WIN_SLUGS,
  SORT_OPTIONS,
  categoryTitle,
  serverMetaTitle,
} from './server-catalog';
import { sectionStyles } from './styles';

const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : String(error);

/** Каталог серверов в обзоре: поиск, актуальный онлайн и запуск выбранной сборки на сервере. */
export function Servers() {
  const host = useHost();
  const core = useCore();
  const tr = useT();
  const builds = useBuilds();
  const mainId = useMainBuildId();
  const [selectedBuild, setSelectedBuild] = useState<string | null>(null);
  const [servers, setServers] = useState<MinecraftServer[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [query, setQuery] = useState('');
  const [filters, setFilters] =
    useState<ServerFilters>(DEFAULT_SERVER_FILTERS);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [showOffline, setShowOffline] = useState(false);
  const [hidePayToWin, setHidePayToWin] = useState(false);
  const [categories, setCategories] = useState<string[]>(CATEGORY_FALLBACK);
  const [versions, setVersions] = useState<string[]>([]);
  const [optionsError, setOptionsError] = useState<string | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>(
    'loading',
  );
  const [error, setError] = useState<string | null>(null);
  const [moreError, setMoreError] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [launchError, setLaunchError] = useState<string | null>(null);
  const requestGeneration = useRef(0);

  const loadFirst = () => setRefreshKey(value => value + 1);

  useEffect(() => {
    let active = true;
    const generation = ++requestGeneration.current;
    setLoadingMore(false);
    setMoreError(null);
    setStatus('loading');
    setError(null);
    const timer = setTimeout(
      () => {
        host.net
          .fetchJson<unknown>(serverPageUrl(0, query, filters))
          .then(raw => {
            if (!active || generation !== requestGeneration.current) return;
            const page = parseServerPage(raw, 0);
            setServers(page.servers);
            setTotal(page.total);
            setOffset(page.count);
            setStatus('ready');
          })
          .catch(reason => {
            if (active && generation === requestGeneration.current) {
              setError(errorMessage(reason));
              setStatus('error');
            }
          });
      },
      query.trim() ? 250 : 0,
    );
    setOffset(0);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [host, query, filters, refreshKey]);

  useEffect(() => {
    let active = true;
    Promise.all([
      host.net.fetchJson<unknown>(
        'https://api.millida.net/v2/rating/modes',
      ),
      host.net.fetchJson<unknown>(
        'https://api.millida.net/v2/rating/servers/versions',
      ),
    ])
      .then(([modeResponse, versionResponse]) => {
        if (!active) return;
        if (
          typeof modeResponse === 'object' &&
          modeResponse !== null &&
          'modes' in modeResponse &&
          Array.isArray(modeResponse.modes)
        ) {
          const codes = modeResponse.modes
            .filter(
              (mode): mode is { code: string; total: number } =>
                typeof mode === 'object' &&
                mode !== null &&
                'code' in mode &&
                typeof mode.code === 'string' &&
                'total' in mode &&
                typeof mode.total === 'number' &&
                mode.total > 0,
            )
            .sort((a, b) => b.total - a.total)
            .map(mode => mode.code);
          if (codes.length) setCategories(codes);
        }
        if (Array.isArray(versionResponse)) {
          const allVersions = versionResponse
            .filter(
              (row): row is { version: string; servers: number } =>
                typeof row === 'object' &&
                row !== null &&
                'version' in row &&
                typeof row.version === 'string' &&
                'servers' in row &&
                typeof row.servers === 'number' &&
                row.servers > 0,
            )
            .sort((a, b) =>
              b.version.localeCompare(a.version, undefined, { numeric: true }),
            )
            .map(row => row.version);
          setVersions(allVersions);
        }
      })
      .catch(reason => {
        if (active) setOptionsError(errorMessage(reason));
      });
    return () => {
      active = false;
    };
  }, [host]);

  const activeBuild =
    builds.find(build => build.id === selectedBuild) ??
    builds.find(build => build.id === mainId) ??
    builds[0];
  const launch = useLaunchState(activeBuild?.id ?? null);
  const loadMore = async () => {
    if (loadingMore || offset >= total) return;
    const generation = requestGeneration.current;
    setLoadingMore(true);
    setMoreError(null);
    try {
      const page = parseServerPage(
        await host.net.fetchJson<unknown>(
          serverPageUrl(offset, query, filters),
        ),
        offset,
      );
      if (generation !== requestGeneration.current) return;
      if (page.count === 0 && offset < page.total) {
        throw new Error('Каталог вернул пустую страницу до конца списка');
      }
      setServers(current => {
        const seen = new Set(current.map(server => server.slug));
        const next = page.servers.filter(server => {
          if (seen.has(server.slug)) return false;
          seen.add(server.slug);
          return true;
        });
        return current.concat(next);
      });
      setOffset(current => current + page.count);
      setTotal(page.total);
    } catch (reason) {
      if (generation === requestGeneration.current) {
        setMoreError(errorMessage(reason));
      }
    } finally {
      if (generation === requestGeneration.current) {
        setLoadingMore(false);
      }
    }
  };

  const setFilter = <K extends keyof ServerFilters>(
    key: K,
    value: ServerFilters[K],
  ) => setFilters(current => ({ ...current, [key]: value }));
  const activeFilterCount =
    Number(!!filters.category) +
    Number(filters.sort !== DEFAULT_SERVER_FILTERS.sort) +
    Number(!!filters.license) +
    Number(!!filters.online) +
    Number(!!filters.version) +
    Number(showOffline) +
    Number(hidePayToWin);
  const visibleServers = servers.filter(
    server =>
      (showOffline || server.isOnline) &&
      (!hidePayToWin || !PAY_TO_WIN_SLUGS.has(server.slug)),
  );

  const refresh = () => setRefreshKey(value => value + 1);
  const connect = (server: MinecraftServer, build: Build) => {
    if (server.target) {
      setLaunchError(null);
      core.launch(build.id, server.target).catch((reason: unknown) => {
        setLaunchError(
          reason instanceof BuildError && reason.code === 'copying'
            ? tr('buildCopyInProgress')
            : errorMessage(reason),
        );
      });
    }
  };

  return (
    <View style={styles.section}>
      <View style={sectionStyles.header}>
        <View style={styles.headingGroup}>
          <Text style={sectionStyles.title}>{tr('servers.title')}</Text>
          <Text style={sectionStyles.small}>
            {status === 'ready'
              ? tr('servers.count', { count: total })
              : tr('servers.subtitle')}
          </Text>
        </View>
        <GlowButton
          label={tr('servers.refresh')}
          onPress={refresh}
          style={styles.accessibleButton}
        >
          <GravityIcon name="ArrowRotateRight" size={14} />
          <GlowText>{tr('servers.refresh')}</GlowText>
        </GlowButton>
      </View>

      <Field
        label={tr('servers.search')}
        icon="Magnifier"
        value={query}
        onChangeText={setQuery}
        placeholder={tr('servers.searchHint')}
        autoCorrect={false}
      />
      <View style={styles.filterHeader}>
        <GlowButton
          label={`${tr(filtersOpen ? 'servers.hideFilters' : 'servers.showFilters')}${
            activeFilterCount ? `: ${activeFilterCount}` : ''
          }`}
          onPress={() => setFiltersOpen(value => !value)}
          expanded={filtersOpen}
          style={styles.accessibleButton}
        >
          <GravityIcon
            name={filtersOpen ? 'ChevronUp' : 'ChevronDown'}
            size={14}
          />
          <GlowText>
            {tr(filtersOpen ? 'servers.hideFilters' : 'servers.showFilters')}
            {activeFilterCount ? ` · ${activeFilterCount}` : ''}
          </GlowText>
        </GlowButton>
        {activeFilterCount > 0 ? (
          <GlowButton
            label={tr('servers.resetFilters')}
            onPress={() => {
              setFilters(DEFAULT_SERVER_FILTERS);
              setShowOffline(false);
              setHidePayToWin(false);
            }}
            style={styles.accessibleButton}
          >
            <GravityIcon name="Xmark" size={14} />
            <GlowText>{tr('servers.resetFilters')}</GlowText>
          </GlowButton>
        ) : null}
      </View>
      {filtersOpen ? (
        <View style={styles.filterPanel}>
          <FilterGroup
            title={tr('servers.filterCategory')}
            value={filters.category}
            options={[
              { value: '', label: tr('servers.allCategories') },
              ...categories.map(category => ({
                value: category,
                label: categoryTitle(category, tr),
              })),
            ]}
            onSelect={value => setFilter('category', value)}
          />
          <FilterGroup
            title={tr('servers.filterSort')}
            value={filters.sort}
            options={SORT_OPTIONS.map(sort => ({
              value: sort,
              label: tr(`servers.sort.${sort}`),
            }))}
            onSelect={value => setFilter('sort', value)}
          />
          <FilterGroup
            title={tr('servers.filterLicense')}
            value={filters.license}
            options={LICENSE_OPTIONS.map(license => ({
              value: license,
              label: tr(
                license === ''
                  ? 'servers.license.any'
                  : license === 'CRACKED'
                  ? 'servers.license.cracked'
                  : 'servers.license.license',
              ),
            }))}
            onSelect={value => setFilter('license', value)}
          />
          <FilterGroup
            title={tr('servers.filterOnline')}
            value={filters.online}
            options={ONLINE_OPTIONS.map(online => ({
              value: online,
              label: tr(
                online === ''
                  ? 'servers.online.any'
                  : online === 'live'
                  ? 'servers.online.live'
                  : online === '20'
                  ? 'servers.online.from20'
                  : 'servers.online.from100',
              ),
            }))}
            onSelect={value => setFilter('online', value)}
          />
          {versions.length ? (
            <FilterGroup
              title={tr('servers.filterVersion')}
              value={filters.version}
              options={[
                { value: '', label: tr('servers.anyVersion') },
                ...versions.map(version => ({ value: version, label: version })),
              ]}
              onSelect={value => setFilter('version', value)}
            />
          ) : null}
          <Pressable
            accessibilityRole="checkbox"
            accessibilityLabel={tr('servers.showOffline')}
            accessibilityState={{ checked: showOffline }}
            onPress={() => setShowOffline(value => !value)}
            style={styles.offlineToggle}
          >
            <View
              style={[
                styles.checkbox,
                showOffline && styles.checkboxSelected,
              ]}
            >
              {showOffline ? (
                <GravityIcon name="Check" size={12} color={colors.onAccent} />
              ) : null}
            </View>
            <Text style={sectionStyles.body}>{tr('servers.showOffline')}</Text>
          </Pressable>
          <Pressable
            accessibilityRole="checkbox"
            accessibilityLabel={tr('servers.hidePayToWin')}
            accessibilityState={{ checked: hidePayToWin }}
            onPress={() => setHidePayToWin(value => !value)}
            style={styles.offlineToggle}
          >
            <View
              style={[
                styles.checkbox,
                hidePayToWin && styles.checkboxSelected,
              ]}
            >
              {hidePayToWin ? (
                <GravityIcon name="Check" size={12} color={colors.onAccent} />
              ) : null}
            </View>
            <Text style={sectionStyles.body}>{tr('servers.hidePayToWin')}</Text>
          </Pressable>
          {optionsError ? (
            <Text
              accessibilityLiveRegion="polite"
              style={sectionStyles.small}
            >
              {tr('servers.filterOptionsFallback')}
            </Text>
          ) : null}
        </View>
      ) : null}

      {builds.length > 0 ? (
        <View style={styles.buildPicker}>
          <Text style={sectionStyles.small}>{tr('servers.playWith')}</Text>
          <View style={controlStyles.buttons}>
            {builds.map(build => (
              <GlowButton
                key={build.id}
                label={build.name}
                glow={build.id === activeBuild?.id ? GLOW_CYAN : GLOW_NEUTRAL}
                selected={build.id === activeBuild?.id}
                style={styles.accessibleButton}
                onPress={() => {
                  setSelectedBuild(build.id);
                  setLaunchError(null);
                }}
              >
                <GravityIcon name="Cube" size={14} />
                <GlowText>{build.name}</GlowText>
              </GlowButton>
            ))}
          </View>
          {isBusy(launch.phase) || launch.phase === 'running' ? (
            <Text style={sectionStyles.small}>
              {phaseText(launch.phase, tr)}
            </Text>
          ) : launch.phase === 'failed' && launch.error ? (
            <Text style={sectionStyles.error}>
              {errorText(launch.error, tr)}
            </Text>
          ) : null}
          {launchError ? (
            <Text
              accessibilityRole="alert"
              accessibilityLiveRegion="polite"
              style={sectionStyles.error}
            >
              {launchError}
            </Text>
          ) : null}
        </View>
      ) : (
        <Text style={sectionStyles.small}>{tr('servers.buildRequired')}</Text>
      )}

      {status === 'loading' ? (
        <Text style={sectionStyles.body}>{tr('servers.loading')}</Text>
      ) : status === 'error' ? (
        <View style={styles.message}>
          <Text style={sectionStyles.error}>
            {tr('servers.loadFailed', { error: error ?? '' })}
          </Text>
          <GlowButton
            label={tr('servers.tryAgain')}
            onPress={loadFirst}
            style={styles.accessibleButton}
          >
            <GravityIcon name="ArrowRotateRight" size={14} />
            <GlowText>{tr('servers.tryAgain')}</GlowText>
          </GlowButton>
        </View>
      ) : visibleServers.length === 0 ? (
        <View style={styles.empty}>
          <Text style={sectionStyles.body}>
            {servers.length === 0
              ? tr('servers.empty')
              : servers.every(server => !server.isOnline) && !hidePayToWin
              ? tr('servers.allOffline')
              : tr('servers.filteredOut')}
          </Text>
          {offset < total ? (
            <MoreButton
              loading={loadingMore}
              error={moreError}
              onPress={loadMore}
            />
          ) : null}
        </View>
      ) : (
        <View>
          {visibleServers.map((server, index) => (
            <ServerRow
              key={server.slug}
              server={server}
              build={activeBuild}
              canLaunch={!isBusy(launch.phase) && launch.phase !== 'running'}
              onConnect={connect}
              showDivider={index < visibleServers.length - 1}
            />
          ))}
          {offset < total ? (
            <MoreButton
              loading={loadingMore}
              error={moreError}
              onPress={loadMore}
            />
          ) : null}
        </View>
      )}
    </View>
  );
}

function ServerRow({
  server,
  build,
  canLaunch,
  onConnect,
  showDivider,
}: {
  server: MinecraftServer;
  build?: Build;
  canLaunch: boolean;
  onConnect: (server: MinecraftServer, build: Build) => void;
  showDivider: boolean;
}) {
  const tr = useT();
  return (
    <View style={[styles.serverRow, showDivider && styles.serverRowDivider]}>
      <Text style={styles.rank}>{server.rank}</Text>
      <ServerLogo server={server} />
      {server.banner ? <ServerBanner server={server} /> : null}
      <View style={styles.serverDetails}>
        <View style={styles.serverTitle}>
          <Text
            style={[sectionStyles.title, styles.serverName]}
            numberOfLines={1}
          >
            {server.name}
          </Text>
          {server.cracked ? (
            <Text style={styles.badge}>{tr('servers.crackedBadge')}</Text>
          ) : null}
          {server.isNew ? (
            <Text style={[styles.badge, styles.newBadge]}>
              {tr('servers.newBadge')}
            </Text>
          ) : null}
          {server.boost > 0 ? (
            <Text style={[styles.badge, styles.boostBadge]}>
              {tr('servers.boosted')}
            </Text>
          ) : null}
          {PAY_TO_WIN_SLUGS.has(server.slug) ? (
            <Text style={[styles.badge, styles.markBadge]}>
              {tr('servers.pay2winBadge')}
            </Text>
          ) : null}
          <View style={styles.status}>
            <View
              style={[
                styles.statusDot,
                server.isOnline
                  ? styles.statusDotOnline
                  : styles.statusDotOffline,
              ]}
            />
            <Text style={styles.statusText}>
              {server.isOnline
                ? tr('servers.online', { count: server.online })
                : tr('servers.offline')}
            </Text>
          </View>
        </View>
        <Text style={sectionStyles.small} numberOfLines={2} selectable>
          {[
            server.modes.map(mode => categoryTitle(mode, tr)).join(', '),
            server.versionSpan,
            serverMetaTitle(server.edition, tr),
            serverMetaTitle(server.kind, tr),
            serverMetaTitle(server.access, tr),
            server.description || server.motd,
            server.address || tr('servers.addressUnknown'),
          ].filter(Boolean).join(' · ')}
        </Text>
        {server.averageOnline > 0 || server.votes > 0 ? (
          <Text style={styles.rowMeta}>
            {[
              server.averageOnline > 0
                ? tr('servers.avgOnline', { count: server.averageOnline })
                : '',
              server.votes > 0
                ? tr('servers.votes', { count: server.votes })
                : '',
            ]
              .filter(Boolean)
              .join(' · ')}
          </Text>
        ) : null}
      </View>
      <GlowButton
        label={tr('servers.join', { name: server.name })}
        glow={GLOW_CYAN_FILL}
        onPress={() => build && onConnect(server, build)}
        disabled={!server.target || !server.isOnline || !build || !canLaunch}
        style={styles.accessibleButton}
      >
        <GlowText onAccent>{tr('servers.openShort')}</GlowText>
      </GlowButton>
    </View>
  );
}

function ServerLogo({ server }: { server: MinecraftServer }) {
  const [failed, setFailed] = useState(false);
  if (!server.logo || failed) {
    return (
      <View style={styles.logoFallback} accessibilityElementsHidden>
        <Text style={styles.logoLetter}>{server.name[0] ?? '?'}</Text>
      </View>
    );
  }
  return (
    <Image
      source={{ uri: server.logo }}
      style={styles.logo}
      resizeMode="cover"
      accessibilityElementsHidden
      importantForAccessibility="no"
      onError={() => setFailed(true)}
    />
  );
}

function ServerBanner({ server }: { server: MinecraftServer }) {
  const [failed, setFailed] = useState(false);
  if (!server.banner || failed) return null;
  return (
    <Image
      source={{ uri: server.banner }}
      style={styles.banner}
      resizeMode="cover"
      accessibilityElementsHidden
      importantForAccessibility="no"
      onError={() => setFailed(true)}
    />
  );
}

function FilterGroup({
  title,
  value,
  options,
  onSelect,
}: {
  title: string;
  value: string;
  options: readonly { value: string; label: string }[];
  onSelect: (value: string) => void;
}) {
  return (
    <View style={styles.filterGroup}>
      <Text style={sectionStyles.small}>{title}</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterOptions}
      >
        {options.map(option => {
          const selected = value === option.value;
          return (
            <Pressable
              key={option.value || 'all'}
              accessibilityRole="button"
              accessibilityLabel={`${title}: ${option.label}`}
              accessibilityState={{ selected }}
              onPress={() => onSelect(option.value)}
              style={[
                styles.filterOption,
                selected && styles.filterOptionSelected,
              ]}
            >
              <Text
                style={[
                  styles.filterOptionLabel,
                  selected && styles.filterOptionLabelSelected,
                ]}
              >
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

function MoreButton({
  loading,
  error,
  onPress,
}: {
  loading: boolean;
  error: string | null;
  onPress: () => void;
}) {
  const tr = useT();
  return (
    <View style={styles.more}>
      {error ? (
        <Text style={sectionStyles.error}>
          {tr('servers.loadFailed', { error })}
        </Text>
      ) : null}
      <GlowButton
        label={loading ? tr('servers.loading') : tr('servers.more')}
        onPress={onPress}
        disabled={loading}
        style={styles.accessibleButton}
      >
        <GravityIcon name="ArrowDown" size={14} />
        <GlowText>
          {loading ? tr('servers.loading') : tr('servers.more')}
        </GlowText>
      </GlowButton>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: 12 },
  accessibleButton: { minHeight: 44, justifyContent: 'center' },
  headingGroup: { flex: 1, gap: 2 },
  buildPicker: { gap: 8 },
  message: { alignItems: 'flex-start', gap: 8 },
  empty: { alignItems: 'flex-start', gap: 8 },
  filterHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  filterPanel: { gap: 10 },
  filterGroup: { gap: 6 },
  filterOptions: { flexDirection: 'row', gap: 6 },
  filterOption: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: colors.field,
  },
  filterOptionSelected: { backgroundColor: colors.accentSoft },
  filterOptionLabel: { fontSize: 12, color: colors.textSecondary },
  filterOptionLabelSelected: { color: colors.accent },
  offlineToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: 44,
  },
  checkbox: {
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.iconSecondary,
    borderRadius: 4,
  },
  checkboxSelected: {
    borderColor: colors.accent,
    backgroundColor: colors.accent,
  },
  serverRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
  },
  serverRowDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.field,
  },
  banner: { width: 76, height: 36, borderRadius: 6 },
  rank: {
    width: 22,
    fontSize: 12,
    textAlign: 'center',
    color: colors.textSecondary,
  },
  logo: { width: 36, height: 36, borderRadius: 8 },
  logoFallback: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: colors.field,
  },
  logoLetter: { fontSize: 16, fontWeight: '700', color: colors.textSecondary },
  serverDetails: { flex: 1, minWidth: 0, gap: 3 },
  serverTitle: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  serverName: { flex: 1, minWidth: 0 },
  badge: {
    fontSize: 10,
    color: colors.danger,
    borderRadius: 4,
    backgroundColor: colors.field,
    overflow: 'hidden',
    paddingHorizontal: 4,
  },
  newBadge: { color: colors.accent },
  boostBadge: { color: colors.accent },
  markBadge: { color: colors.danger },
  status: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusDotOnline: { backgroundColor: colors.accent },
  statusDotOffline: { backgroundColor: colors.iconSecondary },
  statusText: { fontSize: 11, color: colors.text },
  rowMeta: { fontSize: 11, color: colors.textSecondary },
  more: { alignItems: 'center', gap: 8, paddingVertical: 6 },
});
