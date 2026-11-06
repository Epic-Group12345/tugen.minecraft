import { SvgIcon } from '@tugen/sdk';
import { GRAVITY_ICONS } from './gravity-icons';

export type GravityIconName = keyof typeof GRAVITY_ICONS;

interface GravityIconProps {
  name: GravityIconName;
  size?: number;
  color?: string;
}

export function GravityIcon({ name, size = 16, color }: GravityIconProps) {
  return <SvgIcon svg={GRAVITY_ICONS[name]} size={size} color={color} />;
}
