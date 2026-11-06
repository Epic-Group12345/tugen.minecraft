import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { Build, BuildFolder } from '../core';
import { BuildError } from '../core';
import { useCore, useLaunchState } from '../core/react';
import { useT } from '../i18n';
import { Field } from '../ui/controls';
import { GravityIcon, type GravityIconName } from '../ui/icon';
import { GLOW_CYAN_FILL, GLOW_NEUTRAL } from '../ui/glow';
import { GlowButton, GlowText } from '../ui/glow-button';
import { colors, radius } from '../ui/theme';
import { isBusy } from './labels';
import { sectionStyles } from './styles';

const FOLDERS: {
  folder: BuildFolder;
  label:
    | 'buildFolder'
    | 'buildFolder.saves'
    | 'buildFolder.mods'
    | 'buildFolder.resourcepacks'
    | 'buildFolder.shaderpacks'
    | 'buildFolder.screenshots'
    | 'buildFolder.logs';
  icon: GravityIconName;
}[] = [
  { folder: '', label: 'buildFolder', icon: 'FolderOpen' },
  { folder: 'saves', label: 'buildFolder.saves', icon: 'Folder' },
  { folder: 'mods', label: 'buildFolder.mods', icon: 'Folder' },
  { folder: 'resourcepacks', label: 'buildFolder.resourcepacks', icon: 'Folder' },
  { folder: 'shaderpacks', label: 'buildFolder.shaderpacks', icon: 'Folder' },
  { folder: 'screenshots', label: 'buildFolder.screenshots', icon: 'Folder' },
  { folder: 'logs', label: 'buildFolder.logs', icon: 'FileText' },
];

const errorText = (
  error: unknown,
  tr: ReturnType<typeof useT>,
): string => {
  if (error instanceof BuildError) {
    switch (error.code) {
      case 'files':
        return tr('buildCopyFailed');
      case 'name':
        return tr('buildNameRequired');
      case 'not-found':
        return tr('buildNotFound');
      case 'running':
        return tr('buildBusy');
      case 'copying':
        return tr('buildCopyInProgress');
    }
  }
  return error instanceof Error ? error.message : String(error);
};

export function BuildActions({
  build,
  main,
  large = false,
  onLaunch,
}: {
  build: Build;
  main: boolean;
  large?: boolean;
  onLaunch?: () => void;
}) {
  const tr = useT();
  const core = useCore();
  const state = useLaunchState(build.id);
  const [menuOpen, setMenuOpen] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState(build.name);
  const [confirming, setConfirming] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [duplicating, setDuplicating] = useState(false);
  const locked = isBusy(state.phase) || state.phase === 'running';

  const perform = (action: () => void) => {
    setActionError(null);
    setActionNotice(null);
    try {
      action();
    } catch (error) {
      setActionError(errorText(error, tr));
    }
  };

  const duplicate = async () => {
    if (duplicating) {
      return;
    }
    setActionError(null);
    setActionNotice(null);
    setDuplicating(true);
    try {
      const copy = await core.duplicateBuild(build.id, build.name);
      setActionNotice(tr('buildCopySucceeded', { name: copy.name }));
      setMenuOpen(false);
    } catch (error) {
      setActionError(errorText(error, tr));
    } finally {
      setDuplicating(false);
    }
  };

  const rename = () => {
    setActionError(null);
    setActionNotice(null);
    try {
      core.renameBuild(build.id, name);
      setRenaming(false);
      setMenuOpen(false);
    } catch (error) {
      setActionError(errorText(error, tr));
    }
  };

  const remove = () => {
    setActionError(null);
    setActionNotice(null);
    try {
      core.removeBuild(build.id);
      setConfirming(false);
    } catch (error) {
      setActionError(errorText(error, tr));
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.buttons}>
        <GlowButton
          label={state.phase === 'running' ? tr('stop') : tr('play')}
          glow={state.phase === 'running' ? GLOW_NEUTRAL : GLOW_CYAN_FILL}
          onPress={() => {
            setActionError(null);
            setActionNotice(null);
            if (state.phase === 'running') {
              core.stop(build.id);
            } else if (onLaunch) {
              onLaunch();
            } else {
              core.launch(build.id).catch((error: unknown) => {
                setActionError(errorText(error, tr));
              });
            }
          }}
          disabled={isBusy(state.phase) || duplicating}
          style={large ? styles.largeButton : styles.actionButton}
        >
          <GravityIcon
            name={state.phase === 'running' ? 'Stop' : 'Play'}
            size={large ? 18 : 14}
            color={state.phase === 'running' ? colors.text : colors.onAccent}
          />
          <GlowText onAccent={state.phase !== 'running'}>
            {state.phase === 'running' ? tr('stop') : tr('play')}
          </GlowText>
        </GlowButton>
        <GlowButton
          label={tr('buildActions')}
          onPress={() => {
            setActionError(null);
            setActionNotice(null);
            setMenuOpen(value => !value);
            setConfirming(false);
            setRenaming(false);
          }}
          expanded={menuOpen}
          style={styles.menuTrigger}
        >
          <GravityIcon
            name={menuOpen ? 'ChevronUp' : 'ChevronDown'}
            size={14}
          />
          <GlowText>{tr('buildActions')}</GlowText>
        </GlowButton>
      </View>

      {menuOpen ? (
        <ScrollView
          accessibilityRole="menu"
          accessibilityLabel={tr('buildActions')}
          onAccessibilityEscape={() => setMenuOpen(false)}
          style={styles.menu}
          nestedScrollEnabled
        >
          {!main ? (
            <MenuItem
              label={tr('makeMain')}
              icon="Star"
              disabled={duplicating}
              onPress={() => {
                perform(() => core.setMainBuild(build.id));
                setMenuOpen(false);
              }}
            />
          ) : null}
          {FOLDERS.map(item => (
            <MenuItem
              key={item.folder || 'root'}
              label={tr(item.label)}
              icon={item.icon}
              disabled={duplicating}
              onPress={() => {
                perform(() => core.openBuildFolder(build.id, item.folder));
                setMenuOpen(false);
              }}
            />
          ))}
          <MenuItem
            label={tr('buildRename')}
            disabled={duplicating}
            onPress={() => {
              setName(build.name);
              setRenaming(true);
              setMenuOpen(false);
            }}
          />
          <MenuItem
            label={
              duplicating ? tr('buildDuplicating') : tr('buildDuplicate')
            }
            icon="Cube"
            disabled={locked || duplicating}
            onPress={() => void duplicate()}
          />
          {!locked ? (
            <MenuItem
              label={tr('remove')}
              icon="Delete"
              destructive
              disabled={duplicating}
              onPress={() => {
                setConfirming(true);
                setMenuOpen(false);
              }}
            />
          ) : null}
        </ScrollView>
      ) : null}

      {renaming ? (
        <View style={styles.form}>
          <Field
            label={tr('buildRename')}
            value={name}
            onChangeText={setName}
            maxLength={64}
            autoFocus
            onSubmitEditing={rename}
          />
          <View style={styles.buttons}>
            <GlowButton
              label={tr('save')}
              glow={GLOW_CYAN_FILL}
              onPress={rename}
              style={styles.actionButton}
            >
              <GlowText onAccent>{tr('save')}</GlowText>
            </GlowButton>
            <GlowButton
              label={tr('cancel')}
              onPress={() => setRenaming(false)}
              style={styles.actionButton}
            >
              <GlowText>{tr('cancel')}</GlowText>
            </GlowButton>
          </View>
        </View>
      ) : null}

      {confirming ? (
        <View style={styles.form}>
          <Text style={sectionStyles.body}>
            {tr('removeConfirm', { name: build.name })}
          </Text>
          <View style={styles.buttons}>
            <GlowButton
              label={tr('remove')}
              onPress={remove}
              disabled={locked}
              style={styles.actionButton}
            >
              <GravityIcon name="Delete" size={14} color={colors.danger} />
              <Text style={styles.danger}>{tr('remove')}</Text>
            </GlowButton>
            <GlowButton
              label={tr('cancel')}
              onPress={() => setConfirming(false)}
              style={styles.actionButton}
            >
              <GravityIcon name="Xmark" size={14} />
              <GlowText>{tr('cancel')}</GlowText>
            </GlowButton>
          </View>
        </View>
      ) : null}

      {duplicating ? (
        <Text accessibilityLiveRegion="polite" style={sectionStyles.small}>
          {tr('buildDuplicating')}
        </Text>
      ) : null}
      {actionError ? (
        <Text
          accessibilityRole="alert"
          accessibilityLiveRegion="polite"
          style={sectionStyles.error}
        >
          {tr('buildActionFailed', { error: actionError })}
        </Text>
      ) : null}
      {actionNotice ? (
        <Text accessibilityLiveRegion="polite" style={sectionStyles.small}>
          {actionNotice}
        </Text>
      ) : null}
    </View>
  );
}

function MenuItem({
  label,
  icon,
  disabled = false,
  destructive = false,
  onPress,
}: {
  label: string;
  icon?: GravityIconName;
  disabled?: boolean;
  destructive?: boolean;
  onPress: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const [pressed, setPressed] = useState(false);

  return (
    <Pressable
      accessibilityRole="menuitem"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      collapsable={false}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      style={[
        styles.menuItem,
        hovered && styles.menuItemHovered,
        pressed && styles.menuItemPressed,
        disabled && styles.disabled,
      ]}
    >
      {icon ? (
        <GravityIcon
          name={icon}
          size={16}
          color={destructive ? colors.danger : colors.iconSecondary}
        />
      ) : null}
      <Text style={[styles.menuLabel, destructive && styles.danger]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { gap: 8 },
  buttons: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  actionButton: { minHeight: 44, justifyContent: 'center' },
  largeButton: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  menuTrigger: { minHeight: 44, justifyContent: 'center' },
  menu: {
    maxHeight: 320,
    padding: 4,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.field,
    borderRadius: radius.large,
    backgroundColor: colors.surface,
  },
  menuItem: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 10,
    borderRadius: radius.small,
    cursor: 'pointer',
  },
  menuItemHovered: { backgroundColor: colors.hover },
  menuItemPressed: { backgroundColor: colors.pressed },
  menuLabel: { flex: 1, fontSize: 13, color: colors.text },
  form: { gap: 8 },
  danger: { color: colors.danger },
  disabled: { opacity: 0.5, cursor: 'auto' },
});
