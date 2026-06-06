/**
 * Primitive Color Tokens
 * Raw color values without semantic meaning
 */

import * as tokens from '../generated/tokens';

export const colors = {
  // Neutral colors
  black: tokens.ColorBlack,
  white: tokens.ColorWhite,

  // Gray scale
  gray: {
    50: tokens.ColorGray50,
    100: tokens.ColorGray100,
    200: tokens.ColorGray200,
    300: tokens.ColorGray300,
    400: tokens.ColorGray400,
    500: tokens.ColorGray500,
    600: tokens.ColorGray600,
    700: tokens.ColorGray700,
    800: tokens.ColorGray800,
    900: tokens.ColorGray900,
    950: tokens.ColorGray950,
  },

  // Zinc (cooler grays for dark mode)
  zinc: {
    50: tokens.ColorZinc50,
    100: tokens.ColorZinc100,
    200: tokens.ColorZinc200,
    300: tokens.ColorZinc300,
    400: tokens.ColorZinc400,
    500: tokens.ColorZinc500,
    600: tokens.ColorZinc600,
    700: tokens.ColorZinc700,
    800: tokens.ColorZinc800,
    900: tokens.ColorZinc900,
    950: tokens.ColorZinc950,
  },

  // Blue (primary accent)
  blue: {
    50: tokens.ColorBlue50,
    100: tokens.ColorBlue100,
    200: tokens.ColorBlue200,
    300: tokens.ColorBlue300,
    400: tokens.ColorBlue400,
    500: tokens.ColorBlue500,
    600: tokens.ColorBlue600,
    700: tokens.ColorBlue700,
    800: tokens.ColorBlue800,
    900: tokens.ColorBlue900,
    950: tokens.ColorBlue950,
  },

  // Green (success states)
  green: {
    50: tokens.ColorGreen50,
    100: tokens.ColorGreen100,
    200: tokens.ColorGreen200,
    300: tokens.ColorGreen300,
    400: tokens.ColorGreen400,
    500: tokens.ColorGreen500,
    600: tokens.ColorGreen600,
    700: tokens.ColorGreen700,
    800: tokens.ColorGreen800,
    900: tokens.ColorGreen900,
  },

  // Red (error/destructive states)
  red: {
    50: tokens.ColorRed50,
    100: tokens.ColorRed100,
    200: tokens.ColorRed200,
    300: tokens.ColorRed300,
    400: tokens.ColorRed400,
    500: tokens.ColorRed500,
    600: tokens.ColorRed600,
    700: tokens.ColorRed700,
    800: tokens.ColorRed800,
    900: tokens.ColorRed900,
  },

  // Yellow (warning states)
  yellow: {
    50: tokens.ColorYellow50,
    100: tokens.ColorYellow100,
    200: tokens.ColorYellow200,
    300: tokens.ColorYellow300,
    400: tokens.ColorYellow400,
    500: tokens.ColorYellow500,
    600: tokens.ColorYellow600,
    700: tokens.ColorYellow700,
    800: tokens.ColorYellow800,
    900: tokens.ColorYellow900,
  },

  // Orange (secondary accent)
  orange: {
    50: tokens.ColorOrange50,
    100: tokens.ColorOrange100,
    200: tokens.ColorOrange200,
    300: tokens.ColorOrange300,
    400: tokens.ColorOrange400,
    500: tokens.ColorOrange500,
    600: tokens.ColorOrange600,
    700: tokens.ColorOrange700,
    800: tokens.ColorOrange800,
    900: tokens.ColorOrange900,
  },
} as const;
