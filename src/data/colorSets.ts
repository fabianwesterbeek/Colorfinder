import largeData from './generated/large.json';
import mediumData from './generated/medium.json';
import smallData from './generated/small.json';
import type { ColorSetConfig, ColorSetId, NamedColor } from '../types';

const largeColors = largeData as NamedColor[];
const mediumColors = mediumData as NamedColor[];
const smallColors = smallData as NamedColor[];

export const DEFAULT_COLOR_SET: ColorSetId = 'medium';

export const COLOR_SETS: Record<ColorSetId, ColorSetConfig> = {
  large: {
    id: 'large',
    label: 'Large · meodai/color-names',
    count: largeColors.length,
    colors: largeColors
  },
  medium: {
    id: 'medium',
    label: 'Medium · xkcd',
    count: mediumColors.length,
    colors: mediumColors
  },
  small: {
    id: 'small',
    label: 'Small · CSS',
    count: smallColors.length,
    colors: smallColors
  }
};
