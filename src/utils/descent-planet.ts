import { END_RADIUS, START_RADIUS } from "./descent-physics";
import { PLANET_AIMS } from "./descent-planet-aims";

// Interpolate offline ray searches along the fixed trajectory. This keeps the
// frame update independent of the expensive reference solver.
export function planetView(radius: number) {
  const r = Math.max(END_RADIUS, Math.min(START_RADIUS, radius));
  const position =
    (Math.log(START_RADIUS / r) / Math.log(START_RADIUS / END_RADIUS)) *
    (PLANET_AIMS.length - 1);
  const index = Math.min(Math.floor(position), PLANET_AIMS.length - 2);
  const fraction = position - index;
  const [yaw, pitch] = PLANET_AIMS[index];
  const [nextYaw, nextPitch] = PLANET_AIMS[index + 1];
  const delta = Math.atan2(Math.sin(nextYaw - yaw), Math.cos(nextYaw - yaw));
  return {
    yaw: yaw + delta * fraction,
    pitch: pitch + (nextPitch - pitch) * fraction,
  };
}
