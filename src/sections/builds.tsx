import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { Build } from '../core';
import {
  useBuilds,
  useLaunchState,
  useMainBuildId,
} from '../core/react';
import { useT } from '../i18n';
import { Card } from '../ui/controls';
import { GLOW_CYAN_FILL } from '../ui/glow';
import { GlowButton, GlowText } from '../ui/glow-button';
import { colors, radius } from '../ui/theme';
import { BuildForm } from './build-form';
import { GravityIcon } from '../ui/icon';
import { describeBuild, errorText, phaseText } from './labels';
import { sectionStyles } from './styles';
import { BuildActions } from './build-actions';

// Сборки: список и создание новой
export function Builds() {
  const tr = useT();
  const builds = useBuilds();
  const mainId = useMainBuildId();
  // Нет сборок — форма открыта сразу: сюда ведёт «Создать сборку» с обзора
  const [creating, setCreating] = useState(builds.length === 0);

  return (
    <>
      <View style={sectionStyles.header}>
        <View style={styles.headingGroup}>
          <Text style={sectionStyles.heading}>{tr('builds')}</Text>
          <Text style={sectionStyles.small}>
            {tr('buildCount', { count: builds.length })}
          </Text>
        </View>
        {!creating && (
          <GlowButton
            label={tr('createBuild')}
            glow={GLOW_CYAN_FILL}
            onPress={() => setCreating(true)}
          >
            <GravityIcon name="Plus" size={14} color={colors.onAccent} />
            <GlowText onAccent>{tr('createBuild')}</GlowText>
          </GlowButton>
        )}
      </View>
      {creating && (
        <BuildForm
          onDone={() => setCreating(false)}
          cancelable={builds.length > 0}
        />
      )}
      {builds.length === 0 && !creating && (
        <Text style={sectionStyles.body}>{tr('noBuilds')}</Text>
      )}
      {builds.map(build => (
        <BuildRow key={build.id} build={build} main={build.id === mainId} />
      ))}
    </>
  );
}

function BuildRow({ build, main }: { build: Build; main: boolean }) {
  const tr = useT();
  const state = useLaunchState(build.id);

  return (
    <Card>
      <View style={styles.titleRow}>
        <View style={styles.buildMark}>
          <GravityIcon name="Cube" size={18} />
        </View>
        <View style={styles.buildInfo}>
          <Text style={[sectionStyles.title, styles.name]} numberOfLines={1}>
            {build.name}
          </Text>
          {main && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{tr('main')}</Text>
            </View>
          )}
        </View>
      </View>
      <Text style={sectionStyles.body}>{describeBuild(build)}</Text>
      {state.phase !== 'idle' ? (
        <View style={styles.launchStatus}>
          <Text
            style={
              state.phase === 'failed'
                ? sectionStyles.error
                : sectionStyles.small
            }
          >
            {state.phase === 'failed' && state.error
              ? errorText(state.error, tr)
              : phaseText(state.phase, tr)}
          </Text>
          {state.progress && state.progress.total > 0 ? (
            <Text style={sectionStyles.small}>
              {tr('progress', {
                done: state.progress.done,
                total: state.progress.total,
              })}
            </Text>
          ) : null}
        </View>
      ) : null}
      <BuildActions build={build} main={main} />
    </Card>
  );
}

const styles = StyleSheet.create({
  headingGroup: { flex: 1, gap: 2 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  buildMark: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.small,
    backgroundColor: colors.field,
  },
  buildInfo: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  launchStatus: { gap: 2 },
  name: { flexShrink: 1 },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.small,
    backgroundColor: colors.accentSoft,
  },
  badgeText: { fontSize: 11, color: colors.accent },
});
