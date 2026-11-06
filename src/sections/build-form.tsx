import { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import type { Loader, McVersion } from '../core';
import { useCore } from '../core/react';
import { GravityIcon } from '../ui/icon';
import { useT } from '../i18n';
import { Card, ChoiceRow, Field, controlStyles } from '../ui/controls';
import { GLOW_CYAN, GLOW_CYAN_FILL, GLOW_NEUTRAL } from '../ui/glow';
import { GlowButton, GlowText } from '../ui/glow-button';
import { LOADERS, LOADER_NAMES } from './labels';
import { sectionStyles } from './styles';
import { colors } from '../ui/theme';

// Версий у Mojang сотни: рисуем первые, остальное — через поиск
const VERSIONS_SHOWN = 60;

/** Загружаемый список: null — ещё грузится */
type Loaded<T> = { items: T[] | null; error: string | null };

const message = (error: unknown) =>
  error instanceof Error ? error.message : String(error);

interface BuildFormProps {
  onDone: () => void;
  cancelable: boolean;
}

// Форма новой сборки: название, версия игры, загрузчик и его версия. Выбор — строками списка
export function BuildForm({ onDone, cancelable }: BuildFormProps) {
  const tr = useT();
  const core = useCore();
  const [name, setName] = useState('');
  const [snapshots, setSnapshots] = useState(false);
  const [query, setQuery] = useState('');
  const [version, setVersion] = useState<string | null>(null);
  const [loader, setLoader] = useState<Loader>('vanilla');
  // undefined — «последняя»: ядро возьмёт её при первом запуске
  const [loaderVersion, setLoaderVersion] = useState<string | undefined>();
  const [createError, setCreateError] = useState<string | null>(null);

  const [versions, setVersions] = useState<Loaded<McVersion>>({
    items: null,
    error: null,
  });
  useEffect(() => {
    let cancelled = false;
    setVersions({ items: null, error: null });
    core.listVersions(snapshots).then(
      items => {
        if (!cancelled) {
          setVersions({ items, error: null });
          // По умолчанию — свежая версия, если ещё ничего не выбрано
          setVersion(current => current ?? items[0]?.id ?? null);
        }
      },
      error => !cancelled && setVersions({ items: [], error: message(error) }),
    );
    return () => {
      cancelled = true;
    };
  }, [core, snapshots]);

  const [loaderVersions, setLoaderVersions] = useState<Loaded<string>>({
    items: [],
    error: null,
  });
  useEffect(() => {
    setLoaderVersion(undefined);
    if (loader === 'vanilla' || !version) {
      setLoaderVersions({ items: [], error: null });
      return;
    }
    let cancelled = false;
    setLoaderVersions({ items: null, error: null });
    core.listLoaderVersions(loader, version).then(
      items => !cancelled && setLoaderVersions({ items, error: null }),
      error =>
        !cancelled && setLoaderVersions({ items: [], error: message(error) }),
    );
    return () => {
      cancelled = true;
    };
  }, [core, loader, version]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const all = versions.items ?? [];
    return needle
      ? all.filter(item => item.id.toLowerCase().includes(needle))
      : all;
  }, [versions.items, query]);

  // Загрузчик без версий для этой игры — создавать нечего
  const loaderUnavailable =
    loader !== 'vanilla' &&
    loaderVersions.items !== null &&
    loaderVersions.items.length === 0 &&
    !loaderVersions.error;
  const canCreate = !!version && !loaderUnavailable;

  const create = () => {
    if (!version) {
      return;
    }
    try {
      core.createBuild({
        name: name.trim() || `Minecraft ${version}`,
        version,
        loader,
        loaderVersion: loader === 'vanilla' ? undefined : loaderVersion,
      });
      onDone();
    } catch (error) {
      setCreateError(message(error));
    }
  };

  return (
    <Card>
      <Text style={sectionStyles.title}>{tr('newBuild')}</Text>
      <Field
        label={tr('buildName')}
        icon="Cube"
        hint={tr('buildNameHint')}
        value={name}
        onChangeText={setName}
        placeholder={version ? `Minecraft ${version}` : undefined}
      />

      <View style={styles.group}>
        <View style={sectionStyles.header}>
          <Text style={styles.label}>{tr('version')}</Text>
          <GlowButton
            label={tr('snapshots')}
            glow={snapshots ? GLOW_CYAN : GLOW_NEUTRAL}
            selected={snapshots}
            onPress={() => setSnapshots(value => !value)}
          >
            <GravityIcon name="Clock" size={14} />
            <GlowText>{tr('snapshots')}</GlowText>
          </GlowButton>
        </View>
        <Field
          label={tr('versionSearch')}
          icon="Magnifier"
          value={query}
          onChangeText={setQuery}
          placeholder="1.21"
        />
        <VersionList
          state={versions}
          items={filtered.slice(0, VERSIONS_SHOWN)}
          rest={Math.max(0, filtered.length - VERSIONS_SHOWN)}
          selected={version}
          onSelect={setVersion}
        />
      </View>

      <View style={styles.group}>
        <Text style={styles.label}>{tr('loader')}</Text>
        <View style={controlStyles.buttons}>
          {LOADERS.map(item => (
            <GlowButton
              key={item}
              label={LOADER_NAMES[item]}
              glow={item === loader ? GLOW_CYAN : GLOW_NEUTRAL}
              selected={item === loader}
              onPress={() => setLoader(item)}
            >
              <GravityIcon
                name={item === 'vanilla' ? 'Cube' : 'Gear'}
                size={14}
              />
              <GlowText>{LOADER_NAMES[item]}</GlowText>
            </GlowButton>
          ))}
        </View>
      </View>

      {loader !== 'vanilla' && (
        <View style={styles.group}>
          <Text style={styles.label}>{tr('loaderVersion')}</Text>
          <LoaderVersionList
            state={loaderVersions}
            hasVersion={!!version}
            selected={loaderVersion}
            onSelect={setLoaderVersion}
          />
        </View>
      )}

      {createError && (
        <Text style={sectionStyles.error}>
          {tr('error.unknown', { error: createError })}
        </Text>
      )}
      <View style={controlStyles.buttons}>
        <GlowButton
          label={tr('create')}
          glow={GLOW_CYAN_FILL}
          onPress={create}
          disabled={!canCreate}
        >
          <GravityIcon name="Plus" size={14} color={colors.onAccent} />
          <GlowText onAccent>{tr('create')}</GlowText>
        </GlowButton>
        {cancelable && (
          <GlowButton label={tr('cancel')} onPress={onDone}>
            <GravityIcon name="Xmark" size={14} />
            <GlowText>{tr('cancel')}</GlowText>
          </GlowButton>
        )}
      </View>
    </Card>
  );
}

interface VersionListProps {
  state: Loaded<McVersion>;
  items: McVersion[];
  rest: number;
  selected: string | null;
  onSelect: (id: string) => void;
}

function VersionList({
  state,
  items,
  rest,
  selected,
  onSelect,
}: VersionListProps) {
  const tr = useT();
  if (state.error) {
    return (
      <Text style={sectionStyles.error}>
        {tr('loadFailed', { error: state.error })}
      </Text>
    );
  }
  if (!state.items) {
    return <Text style={sectionStyles.small}>{tr('loading')}</Text>;
  }
  if (items.length === 0) {
    return <Text style={sectionStyles.small}>{tr('noVersions')}</Text>;
  }
  return (
    <ScrollView style={styles.list} nestedScrollEnabled>
      {items.map(item => (
        <ChoiceRow
          key={item.id}
          title={item.id}
          detail={item.type === 'release' ? undefined : item.type}
          selected={item.id === selected}
          onPress={() => onSelect(item.id)}
        />
      ))}
      {rest > 0 && (
        <View style={styles.more}>
          <GravityIcon name="ArrowDown" size={14} />
          <Text style={sectionStyles.small}>
            {tr('moreVersions', { count: rest })}
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

interface LoaderVersionListProps {
  state: Loaded<string>;
  hasVersion: boolean;
  selected: string | undefined;
  onSelect: (version: string | undefined) => void;
}

function LoaderVersionList({
  state,
  hasVersion,
  selected,
  onSelect,
}: LoaderVersionListProps) {
  const tr = useT();
  if (!hasVersion) {
    return <Text style={sectionStyles.small}>{tr('pickVersionFirst')}</Text>;
  }
  if (state.error) {
    return (
      <Text style={sectionStyles.error}>
        {tr('loadFailed', { error: state.error })}
      </Text>
    );
  }
  if (!state.items) {
    return <Text style={sectionStyles.small}>{tr('loading')}</Text>;
  }
  if (state.items.length === 0) {
    return <Text style={sectionStyles.small}>{tr('noLoaderVersions')}</Text>;
  }
  return (
    <ScrollView style={styles.list} nestedScrollEnabled>
      <ChoiceRow
        title={tr('loaderLatest')}
        detail={tr('loaderLatestHint')}
        selected={selected === undefined}
        onPress={() => onSelect(undefined)}
      />
      {state.items.map(item => (
        <ChoiceRow
          key={item}
          title={item}
          selected={item === selected}
          onPress={() => onSelect(item)}
        />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  group: { gap: 8 },
  label: { fontSize: 12, color: colors.textSecondary },
  // Список выбора — своя прокрутка внутри экрана
  list: { maxHeight: 220 },
  more: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
});
