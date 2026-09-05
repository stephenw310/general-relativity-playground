// Radial free fall from rest at infinity in a Schwarzschild spacetime.
// Radius is in Schwarzschild radii; proper time is in rs/c.
export const START_RADIUS = 6;
export const END_RADIUS = 0.015;
export const RS_KM = 2.95325 * 4_300_000;
export const TIME_UNIT_SECONDS = RS_KM / 299_792.458;
export const FALL_DURATION =
  (2 / 3) * (START_RADIUS ** 1.5 - END_RADIUS ** 1.5);
export const FLIGHT_INCLINATION = 0.24;
export const PLANET_DIRECTION = [-0.9, 0.2, -0.35] as const;

// Presentation time is expanded inside the horizon. Interpolation within each
// chapter remains linear in proper time, not radius. Playback speed scales all
// chapters equally and does not change the underlying free-fall trajectory.
export const FLIGHT_CHAPTERS = [
  { start: 6, end: 1, seconds: 100, label: "Approach" },
  { start: 1, end: 0.35, seconds: 35, label: "Inside" },
  { start: 0.35, end: 0.06, seconds: 35, label: "Tidal stretch" },
  { start: 0.06, end: END_RADIUS, seconds: 20, label: "Final moments" },
] as const;
export const PLAYBACK_DURATION = FLIGHT_CHAPTERS.reduce(
  (sum, c) => sum + c.seconds,
  0,
);

export function radiusAt(progress: number) {
  let elapsed = Math.max(0, Math.min(1, progress)) * PLAYBACK_DURATION;
  for (const chapter of FLIGHT_CHAPTERS) {
    if (elapsed <= chapter.seconds) {
      const fraction = elapsed / chapter.seconds;
      if (fraction < 1e-10) return chapter.start;
      if (fraction > 1 - 1e-10) return chapter.end;
      return (
        (chapter.start ** 1.5 +
          fraction * (chapter.end ** 1.5 - chapter.start ** 1.5)) **
        (2 / 3)
      );
    }
    elapsed -= chapter.seconds;
  }
  return END_RADIUS;
}

export function progressAt(radius: number) {
  const r = Math.max(END_RADIUS, Math.min(START_RADIUS, radius));
  let elapsed = 0;
  for (const chapter of FLIGHT_CHAPTERS) {
    if (r >= chapter.end) {
      return (
        (elapsed +
          (chapter.seconds * (chapter.start ** 1.5 - r ** 1.5)) /
            (chapter.start ** 1.5 - chapter.end ** 1.5)) /
        PLAYBACK_DURATION
      );
    }
    elapsed += chapter.seconds;
  }
  return 1;
}

export function properTimeAt(radius: number) {
  return (2 / 3) * (START_RADIUS ** 1.5 - radius ** 1.5) * TIME_UNIT_SECONDS;
}

export function remainingProperTime(radius: number) {
  return (2 / 3) * radius ** 1.5 * TIME_UNIT_SECONDS;
}

export function tidalAcceleration(radius: number) {
  return (299_792_458 ** 2 * 2) / ((RS_KM * 1000) ** 2 * radius ** 3);
}

// An illustrative deformation cue, not a material-strength calculation.
export function tidalStrain(radius: number) {
  return Math.max(
    0,
    Math.min(1, Math.log10(Math.max(tidalAcceleration(radius), 1)) / 2.6),
  );
}

export function stageAt(radius: number) {
  if (radius <= END_RADIUS + 0.000001) return "Tidal limit reached";
  if (radius <= 0.06) return "The final moments";
  if (radius <= 0.35) return "Tidal forces rising";
  if (radius <= 1) return "Inside the horizon";
  if (radius <= 1.5) return "Final approach";
  if (radius <= 3) return "Below the inner disk";
  return "Approaching black hole";
}
