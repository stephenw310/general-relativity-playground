import { MASS_MIN_VALUE, MASS_MAX_VALUE } from "@/constants/physics";
import {
  MASS_SCALE_MIN,
  MASS_SCALE_MAX,
  MASS_SCALE_DEFAULT,
  MASS_SCALE_HOVERED,
  MASS_SCALE_SELECTED,
  MASS_SPHERE_RADIUS,
} from "@/constants/ui";

// Calculate mass-proportional base scale
export function getMassProportionalScale(massValue: number): number {
  // Normalize mass value from [MASS_MIN_VALUE, MASS_MAX_VALUE] to [0, 1]
  const normalizedMass =
    (massValue - MASS_MIN_VALUE) / (MASS_MAX_VALUE - MASS_MIN_VALUE);
  // Map to scale range [MASS_SCALE_MIN, MASS_SCALE_MAX]
  return MASS_SCALE_MIN + normalizedMass * (MASS_SCALE_MAX - MASS_SCALE_MIN);
}

// Calculate actual visual radius for collision detection based on mass value
export function getActualVisualRadius(massValue: number): number {
  const scale = getMassProportionalScale(massValue);
  return MASS_SPHERE_RADIUS * scale;
}

// Calculate final scale including interaction states
export function getFinalMassScale(
  massValue: number,
  isSelected: boolean,
  isHovered: boolean,
): number {
  const massProportionalScale = getMassProportionalScale(massValue);

  // Apply interactive scaling modifiers on top of mass-proportional scale
  if (isSelected) return massProportionalScale * MASS_SCALE_SELECTED;
  if (isHovered) return massProportionalScale * MASS_SCALE_HOVERED;
  return massProportionalScale * MASS_SCALE_DEFAULT;
}
