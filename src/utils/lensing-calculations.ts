import { EINSTEIN_ANGLE_ARCSEC, EINSTEIN_RADIUS_BASE } from "@/constants";

export function getEinsteinAngle(lensMass: number) {
  return EINSTEIN_ANGLE_ARCSEC * Math.sqrt(lensMass);
}

export function getEinsteinRadius(lensMass: number) {
  return EINSTEIN_RADIUS_BASE * Math.sqrt(lensMass);
}

export function getSourceAlignment(sourceX: number, sourceY: number) {
  return Math.hypot(sourceX, sourceY);
}

export function getLensingRegime(
  sourceX: number,
  sourceY: number,
  stellarEllipticity: number,
  externalShear: number,
) {
  const alignment = getSourceAlignment(sourceX, sourceY);
  const causticScale = 0.06 + stellarEllipticity * 0.5 + externalShear * 0.8;

  if (alignment < 0.035) {
    return "Near-complete ring";
  }

  if (alignment < causticScale) {
    return "Four-image lens";
  }

  if (alignment < 0.72) {
    return "Fold arcs + counterimage";
  }

  return "Two-image lens";
}
