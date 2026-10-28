import { useHost } from '@tugen/sdk';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import type { Build, LaunchState } from '../core';
import {
  useBuilds,
  useCore,
  useLaunchState,
  useMainBuildId,
} from '../core/react';
import { useT } from '../i18n';
import { Card, ProgressBar } from '../ui/controls';
import { GLOW_CYAN_FILL, GLOW_NEUTRAL } from '../ui/glow';
import { GlowButton, GlowText } from '../ui/glow-button';
import { colors } from '../ui/theme';
import { describeBuild, errorText, isBusy, phaseText } from './labels';
import { sectionStyles } from './styles';

// Сколько последних строк журнала видно свёрнутым и развёрнутым
const LOG_COLLAPSED = 4;
const LOG_EXPANDED = 200;

// Обзор: основная сборка и запуск игры
export function Overview() {
  const builds = useBuilds();
  const mainId = useMainBuildId();
  // Основной нет (удалили) — берём первую, чтобы «Играть» было куда нажать
  const main = builds.find(build => build.id === mainId) ?? builds[0];
  return main ? <MainBuild build={main} /> : <NoBuilds />;
}

function NoBuilds() {
  const tr = useT();
  const host = useHost();
  return (
    <Card>
      <Text style={sectionStyles.heading}>Minecraft</Text>
      <Text style={sectionStyles.title}>{tr('noBuilds')}</Text>
      <Text style={sectionStyles.body}>{tr('noBuildsHint')}</Text>
      <View style={styles.actions}>
        <GlowButton
          label={tr('createBuild')}
          glow={GLOW_CYAN_FILL}
          onPress={() => host.navigation.open('builds')}
          style={styles.bigButton}
        >
          <Text style={styles.bigLabel}>{tr('createBuild')}</Text>
        </GlowButton>
      </View>
    </Card>
  );
}

function MainBuild({ build }: { build: Build }) {
  const tr = useT();
  const core = useCore();
  const state = useLaunchState(build.id);
  // Отказ launch() до того, как ядро успело записать ошибку в состояние
  const [launchError, setLaunchError] = useState<string | null>(null);
  const busy = isBusy(state.phase);
  const running = state.phase === 'running';

  const play = () => {
    setLaunchError(null);
    core.launch(build.id).catch((error: unknown) => {
      setLaunchError(error instanceof Error ? error.message : String(error));
    });
  };

  const error =
    state.phase === 'failed' && state.error
      ? errorText(state.error, tr)
      : launchError && !busy && !running
      ? tr('error.unknown', { error: launchError })
      : null;

  return (
    <>
      <Card>
        <Text style={sectionStyles.small}>{tr('mainBuild')}</Text>
        <Text style={sectionStyles.heading} numberOfLines={1}>
          {build.name}
        </Text>
        <Text style={sectionStyles.body}>{describeBuild(build)}</Text>
        <View style={styles.actions}>
          {running ? (
            <GlowButton
              label={tr('stop')}
              glow={GLOW_NEUTRAL}
              onPress={() => core.stop(build.id)}
              style={styles.bigButton}
            >
              <Text style={[styles.bigLabel, styles.bigLabelLight]}>
                {tr('stop')}
              </Text>
            </GlowButton>
          ) : (
            <GlowButton
              label={tr('play')}
              glow={GLOW_CYAN_FILL}
              onPress={play}
              disabled={busy}
              style={styles.bigButton}
            >
              <Text style={styles.bigLabel}>{tr('play')}</Text>
            </GlowButton>
          )}
          {state.phase !== 'idle' && state.phase !== 'failed' && (
            <Text style={sectionStyles.body}>{phaseText(state.phase, tr)}</Text>
          )}
        </View>
        {busy && <Progress state={state} />}
        {error && (
          <View style={styles.errorBox}>
            <Text style={sectionStyles.error}>{error}</Text>
            {state.log.length > 0 && (
              <Text style={sectionStyles.small}>{tr('errorLogHint')}</Text>
            )}
          </View>
        )}
      </Card>
      <Log lines={state.log} />
    </>
  );
}

function Progress({ state }: { state: LaunchState }) {
  const tr = useT();
  const progress = state.progress;
  if (!progress || progress.total <= 0) {
    return null;
  }
  return (
    <View style={styles.progress}>
      <ProgressBar value={progress.done / progress.total} />
      <Text style={sectionStyles.small}>
        {tr('progress', { done: progress.done, total: progress.total })}
      </Text>
    </View>
  );
}

function Log({ lines }: { lines: readonly string[] }) {
  const tr = useT();
  const [expanded, setExpanded] = useState(false);
  const visible = lines.slice(-(expanded ? LOG_EXPANDED : LOG_COLLAPSED));
  return (
    <Card>
      <View style={sectionStyles.header}>
        <Text style={sectionStyles.title}>{tr('log')}</Text>
        {lines.length > LOG_COLLAPSED && (
          <GlowButton
            label={expanded ? tr('hideLog') : tr('showLog')}
            onPress={() => setExpanded(value => !value)}
          >
            <GlowText>{expanded ? tr('hideLog') : tr('showLog')}</GlowText>
          </GlowButton>
        )}
      </View>
      {visible.length === 0 ? (
        <Text style={sectionStyles.small}>{tr('logEmpty')}</Text>
      ) : (
        <ScrollView
          style={expanded ? styles.logExpanded : undefined}
          nestedScrollEnabled
        >
          {visible.map((line, index) => (
            <Text key={index} style={styles.logLine} selectable>
              {line}
            </Text>
          ))}
        </ScrollView>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 4,
  },
  // Большая кнопка: те же тени и скругление, что у кнопок островов, только просторнее
  bigButton: { paddingHorizontal: 18, paddingVertical: 10 },
  bigLabel: { fontSize: 16, fontWeight: '600', color: colors.onAccent },
  bigLabelLight: { color: colors.text },
  progress: { gap: 6 },
  errorBox: { gap: 4 },
  logExpanded: { maxHeight: 320 },
  logLine: { fontSize: 12, lineHeight: 18, color: colors.textSecondary },
});
