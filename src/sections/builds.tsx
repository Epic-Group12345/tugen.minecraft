import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { Build } from '../core';
import {
  useBuilds,
  useCore,
  useLaunchState,
  useMainBuildId,
} from '../core/react';
import { useT } from '../i18n';
import { Card, controlStyles } from '../ui/controls';
import { GLOW_CYAN_FILL } from '../ui/glow';
import { GlowButton, GlowText } from '../ui/glow-button';
import { colors, radius } from '../ui/theme';
import { BuildForm } from './build-form';
import { describeBuild, isBusy } from './labels';
import { sectionStyles } from './styles';

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
        <Text style={sectionStyles.heading}>{tr('builds')}</Text>
        {!creating && (
          <GlowButton
            label={tr('createBuild')}
            glow={GLOW_CYAN_FILL}
            onPress={() => setCreating(true)}
          >
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
  const core = useCore();
  const state = useLaunchState(build.id);
  const [confirming, setConfirming] = useState(false);
  // Запущенную или готовящуюся сборку не удаляем: её файлы сейчас в деле
  const locked = isBusy(state.phase) || state.phase === 'running';

  return (
    <Card>
      <View style={styles.titleRow}>
        <Text style={[sectionStyles.title, styles.name]} numberOfLines={1}>
          {build.name}
        </Text>
        {main && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{tr('main')}</Text>
          </View>
        )}
      </View>
      <Text style={sectionStyles.body}>{describeBuild(build)}</Text>
      {confirming ? (
        <View style={styles.confirm}>
          <Text style={sectionStyles.body}>
            {tr('removeConfirm', { name: build.name })}
          </Text>
          <View style={controlStyles.buttons}>
            <GlowButton
              label={tr('remove')}
              onPress={() => {
                setConfirming(false);
                core.removeBuild(build.id);
              }}
              disabled={locked}
            >
              <Text style={styles.danger}>{tr('remove')}</Text>
            </GlowButton>
            <GlowButton
              label={tr('cancel')}
              onPress={() => setConfirming(false)}
            >
              <GlowText>{tr('cancel')}</GlowText>
            </GlowButton>
          </View>
        </View>
      ) : (
        <View style={controlStyles.buttons}>
          {!main && (
            <GlowButton
              label={tr('makeMain')}
              onPress={() => core.setMainBuild(build.id)}
            >
              <GlowText>{tr('makeMain')}</GlowText>
            </GlowButton>
          )}
          <GlowButton
            label={tr('folder')}
            onPress={() => core.openBuildFolder(build.id)}
          >
            <GlowText>{tr('folder')}</GlowText>
          </GlowButton>
          <GlowButton
            label={tr('remove')}
            onPress={() => setConfirming(true)}
            disabled={locked}
          >
            <GlowText>{tr('remove')}</GlowText>
          </GlowButton>
        </View>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  name: { flexShrink: 1 },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.small,
    backgroundColor: colors.accentSoft,
  },
  badgeText: { fontSize: 11, color: colors.accent },
  confirm: { gap: 8 },
  danger: {
    paddingHorizontal: 6,
    fontSize: 12,
    lineHeight: 16,
    color: colors.danger,
  },
});
