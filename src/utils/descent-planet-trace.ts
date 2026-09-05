import { FLIGHT_INCLINATION, PLANET_DIRECTION } from "./descent-physics";

// Shoot backward rays in the plane containing the ship, center, and planet.
// Offline reference solver used by the table generator and accuracy tests only.
function escapedAngle(radius: number, angle: number): number | null {
  let x = radius,
    y = 0,
    px = -Math.cos(angle),
    py = -Math.sin(angle);
  function rate(x: number, y: number, px: number, py: number) {
    const r = Math.hypot(x, y),
      p = Math.hypot(px, py);
    const nx = x / r,
      ny = y / r,
      flow = 1 / Math.sqrt(r);
    const dot = px * nx + py * ny;
    return [
      px / p - flow * nx,
      py / p - flow * ny,
      (flow / r) * (px - 1.5 * dot * nx),
      (flow / r) * (py - 1.5 * dot * ny),
    ];
  }
  for (let i = 0; i < 520; i++) {
    const r = Math.hypot(x, y);
    if (r > 32) return Math.atan2(-py, -px);
    if (r < 0.00002 || Math.hypot(px, py) > 200000) return null;
    const h = -Math.max(
      0.00000005,
      Math.min(1, (r * 0.06) / (1 + 1 / Math.sqrt(r))),
    );
    const a = rate(x, y, px, py);
    const b = rate(
      x + (a[0] * h) / 2,
      y + (a[1] * h) / 2,
      px + (a[2] * h) / 2,
      py + (a[3] * h) / 2,
    );
    x += b[0] * h;
    y += b[1] * h;
    px += b[2] * h;
    py += b[3] * h;
  }
  return null;
}

export function tracePlanetView(radius: number) {
  const si = Math.sin(FLIGHT_INCLINATION),
    ci = Math.cos(FLIGHT_INCLINATION);
  const len = Math.hypot(...PLANET_DIRECTION);
  const d = PLANET_DIRECTION.map((v) => v / len);
  const cosTarget = d[1] * si + d[2] * ci;
  const target = Math.acos(cosTarget);
  let best = 0,
    bestError = Infinity;
  // Coarse search followed by local refinement, selecting the direct image.
  let lo = 0,
    hi = Math.PI;
  for (let pass = 0; pass < 4; pass++) {
    const step = (hi - lo) / 48;
    for (let i = 0; i <= 48; i++) {
      const angle = lo + i * step;
      const out = escapedAngle(radius, angle);
      if (out === null) continue;
      const error = Math.abs(
        Math.atan2(Math.sin(out - target), Math.cos(out - target)),
      );
      if (error < bestError) {
        best = angle;
        bestError = error;
      }
    }
    lo = Math.max(0, best - step);
    hi = Math.min(Math.PI, best + step);
  }
  const sinTarget = Math.sin(target);
  const tangent = [
    d[0] / sinTarget,
    (d[1] - cosTarget * si) / sinTarget,
    (d[2] - cosTarget * ci) / sinTarget,
  ];
  const vx = Math.sin(best) * tangent[0];
  const vy = Math.cos(best) * si + Math.sin(best) * tangent[1];
  const vz = Math.cos(best) * ci + Math.sin(best) * tangent[2];
  return {
    yaw: Math.atan2(vx, -(vy * si + vz * ci)),
    pitch: Math.asin(Math.max(-1, Math.min(1, vy * ci - vz * si))),
  };
}
