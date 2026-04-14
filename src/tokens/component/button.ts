/**
 * Component Token: Button
 * Button-specific tokens derived from semantic tokens
 */

import { spacing } from "../primitive/spacing";
import { fontSize } from "../primitive/typography";
import { fontWeight } from "../primitive/typography";
import { radius } from "../primitive/radius";
import { motionTokens } from "../motion/motion";

export const buttonTokens = {
  // Padding by size
  padding: {
    sm: `${spacing[2]} ${spacing[3]}`,
    md: `${spacing[3]} ${spacing[4]}`,
    lg: `${spacing[4]} ${spacing[6]}`,
  },

  // Font size by size
  fontSize: {
    sm: fontSize.sm,
    md: fontSize.base,
    lg: fontSize.lg,
  },

  // Font weight
  fontWeight: fontWeight.medium,

  // Border radius
  borderRadius: radius.md,

  // Transition
  transition: {
    duration: motionTokens.duration.fast,
    easing: motionTokens.easing.smooth,
  },

  // Min height for touch targets (accessibility)
  minHeight: {
    sm: "36px",
    md: "44px", // WCAG minimum touch target
    lg: "48px",
  },
} as const;
