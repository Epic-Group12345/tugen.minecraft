import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useCore, useSettings } from '../core/react';
import { useT } from '../i18n';
import { Card, Field } from '../ui/controls';
import { GravityIcon, type GravityIconName } from '../ui/icon';
import { GLOW_CYAN, GLOW_NEUTRAL } from '../ui/glow';
import { GlowButton, GlowText } from '../ui/glow-button';
import { colors } from '../ui/theme';
import { sectionStyles } from './styles';

// Шаг памяти кнопками − и +
const MEMORY_STEP_MB = 512;

// Настройки Minecraft, переехавшие из лаунчера: ник, память, аргументы JVM, окно игры.
// Текст сохраняется по завершении ввода (уход из поля или Enter), а не на каждую букву
export function Settings() {
  const tr = useT();
  return (
    <>
      <Text style={sectionStyles.heading}>{tr('settings')}</Text>
      <SettingsGroup title={tr('settings.player')} icon="Person">
        <NicknameCard />
      </SettingsGroup>
      <SettingsGroup title={tr('settings.performance')} icon="Display">
        <MemoryCard />
      </SettingsGroup>
      <SettingsGroup title={tr('settings.launch')} icon="Gear">
        <JvmArgsCard />
        <View style={styles.divider} />
        <WindowCard />
      </SettingsGroup>
    </>
  );
}

function SettingsGroup({
  title,
  children,
  icon,
}: {
  title: string;
  icon: GravityIconName;
  children: ReactNode;
}) {
  return (
    <View style={styles.group}>
      <View style={styles.groupHeading}>
        <GravityIcon name={icon} size={14} color={colors.iconSecondary} />
        <Text style={styles.groupTitle}>{title}</Text>
      </View>
      <Card>{children}</Card>
    </View>
  );
}

/** Черновик поля, который сбрасывается, когда значение поменялось извне */
function useDraft(value: string) {
  const [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value]);
  return [draft, setDraft] as const;
}

function NicknameCard() {
  const tr = useT();
  const core = useCore();
  const settings = useSettings();
  const [draft, setDraft] = useDraft(settings.nickname);
  const valid = core.isValidNickname(draft.trim());

  const save = () => {
    const nickname = draft.trim();
    if (core.isValidNickname(nickname) && nickname !== settings.nickname) {
      core.setSettings({ nickname });
    }
  };

  return (
    <Field
      label={tr('nickname')}
      icon="Person"
      value={draft}
      onChangeText={setDraft}
      onBlur={save}
      onSubmitEditing={save}
      error={valid ? null : tr('nicknameInvalid')}
      maxLength={16}
      autoCorrect={false}
      autoCapitalize="none"
    />
  );
}

function MemoryCard() {
  const tr = useT();
  const core = useCore();
  const settings = useSettings();
  const range = useMemo(() => core.memoryRange(), [core]);
  const memory = settings.memoryMb;

  const set = (value: number) => {
    const next = Math.min(range.max, Math.max(range.min, value));
    if (next !== memory) {
      core.setSettings({ memoryMb: next });
    }
  };

  return (
    <>
      <Text style={styles.label}>{tr('memory')}</Text>
      <View style={styles.memoryRow}>
        <GlowButton
          label={tr('memoryLess')}
          onPress={() => set(memory - MEMORY_STEP_MB)}
          disabled={memory <= range.min}
          style={styles.stepper}
        >
          <GravityIcon name="Minus" size={14} />
        </GlowButton>
        <Text style={styles.memoryValue}>
          {memory} {tr('mb')}
        </Text>
        <GlowButton
          label={tr('memoryMore')}
          onPress={() => set(memory + MEMORY_STEP_MB)}
          disabled={memory >= range.max}
          style={styles.stepper}
        >
          <GravityIcon name="Plus" size={14} />
        </GlowButton>
        <GlowButton
          label={tr('recommended')}
          glow={memory === range.recommended ? GLOW_CYAN : GLOW_NEUTRAL}
          selected={memory === range.recommended}
          onPress={() => set(range.recommended)}
        >
          <GravityIcon name="Star" size={14} />
          <GlowText>{tr('recommended')}</GlowText>
        </GlowButton>
      </View>
      <Text style={sectionStyles.small}>
        {tr('memoryHint', {
          min: range.min,
          max: range.max,
          recommended: range.recommended,
        })}
      </Text>
    </>
  );
}

function JvmArgsCard() {
  const tr = useT();
  const core = useCore();
  const settings = useSettings();
  const [draft, setDraft] = useDraft(settings.jvmArgs);

  const save = () => {
    const jvmArgs = draft.trim();
    if (jvmArgs !== settings.jvmArgs) {
      core.setSettings({ jvmArgs });
    }
  };

  return (
    <Field
      label={tr('jvmArgs')}
      icon="Gear"
      hint={tr('jvmArgsHint')}
      value={draft}
      onChangeText={setDraft}
      onBlur={save}
      onSubmitEditing={save}
      autoCorrect={false}
      autoCapitalize="none"
      placeholder="-XX:+UseG1GC"
    />
  );
}

// 0 в настройках — размер выбирает игра; в поле это пустая строка
const sizeText = (value: number) => (value > 0 ? String(value) : '');

/** Пусто — 0; целое неотрицательное — число; иначе null (ошибка) */
const parseSize = (text: string): number | null => {
  const trimmed = text.trim();
  if (trimmed === '') {
    return 0;
  }
  return /^\d{1,5}$/.test(trimmed) ? Number(trimmed) : null;
};

function WindowCard() {
  const tr = useT();
  const core = useCore();
  const settings = useSettings();
  const [width, setWidth] = useDraft(sizeText(settings.windowWidth));
  const [height, setHeight] = useDraft(sizeText(settings.windowHeight));
  const widthValue = parseSize(width);
  const heightValue = parseSize(height);

  const save = () => {
    const patch: { windowWidth?: number; windowHeight?: number } = {};
    if (widthValue !== null && widthValue !== settings.windowWidth) {
      patch.windowWidth = widthValue;
    }
    if (heightValue !== null && heightValue !== settings.windowHeight) {
      patch.windowHeight = heightValue;
    }
    if (Object.keys(patch).length > 0) {
      core.setSettings(patch);
    }
  };

  const invalid = widthValue === null || heightValue === null;
  return (
    <>
      <Text style={styles.label}>{tr('windowSize')}</Text>
      <View style={styles.windowRow}>
        <View style={styles.windowField}>
          <Field
            label={tr('windowWidth')}
            icon="Display"
            value={width}
            onChangeText={setWidth}
            onBlur={save}
            onSubmitEditing={save}
            keyboardType="number-pad"
            placeholder="854"
            maxLength={5}
          />
        </View>
        <Text style={styles.times}>×</Text>
        <View style={styles.windowField}>
          <Field
            label={tr('windowHeight')}
            icon="Display"
            value={height}
            onChangeText={setHeight}
            onBlur={save}
            onSubmitEditing={save}
            keyboardType="number-pad"
            placeholder="480"
            maxLength={5}
          />
        </View>
      </View>
      {invalid ? (
        <Text style={sectionStyles.error}>{tr('windowInvalid')}</Text>
      ) : (
        <Text style={sectionStyles.small}>{tr('windowHint')}</Text>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  group: { gap: 8 },
  groupHeading: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  groupTitle: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.8,
    color: colors.textSecondary,
  },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.field },
  label: { fontSize: 12, color: colors.textSecondary },
  memoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  stepper: { minWidth: 32, justifyContent: 'center' },
  memoryValue: {
    minWidth: 96,
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    color: colors.text,
  },
  windowRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  windowField: { width: 120 },
  times: { paddingBottom: 8, fontSize: 14, color: colors.textSecondary },
});
