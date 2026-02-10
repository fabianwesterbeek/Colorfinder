export type ColorSetId = 'large' | 'medium' | 'small';

export type Lab = [number, number, number];

export interface NamedColor {
  name: string;
  hex: string;
  lab: Lab;
}

export interface MatchResult extends NamedColor {
  deltaE: number;
}

export interface ColorSetConfig {
  id: ColorSetId;
  label: string;
  count: number;
  colors: NamedColor[];
}
