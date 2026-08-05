/**
 * Relativity helpers use SI for reported quantities and geometrized units
 * (G = c = r_s = 1) for Schwarzschild trajectory integration.
 */

export const SPEED_OF_LIGHT = 299_792_458;
export const GRAVITATIONAL_CONSTANT = 6.6743e-11;
export const SOLAR_MASS_KG = 1.98847e30;
export const PARSEC_METERS = 3.085677581491367e16;
export const SOLAR_MASS_TIME_SECONDS = 4.925490947e-6;
export const SOLAR_MASS_LENGTH_KM = 1.4766250385;
export const CRITICAL_PHOTON_IMPACT = (3 * Math.sqrt(3)) / 2;

export function schwarzschildRadiusKm(massSolar: number) {
  return 2 * SOLAR_MASS_LENGTH_KM * massSolar;
}

/** Proper-time rate for a static Schwarzschild observer: dτ/dt. */
export function staticClockRate(radiusInSchwarzschildRadii: number) {
  const radius = Math.max(radiusInSchwarzschildRadii, 1 + Number.EPSILON * 4);
  return Math.sqrt(1 - 1 / radius);
}

/**
 * Proper-time rate for a freely orbiting circular geodesic, relative to a
 * clock at infinity. Circular orbits exist above 1.5 r_s and are stable from
 * 3 r_s outward.
 */
export function circularOrbitClockRate(radiusInSchwarzschildRadii: number) {
  const radius = Math.max(radiusInSchwarzschildRadii, 1.500001);
  return Math.sqrt(1 - 1.5 / radius);
}

export type GeodesicPoint = { x: number; y: number; r: number; phi: number };

export interface NullGeodesicResult {
  points: GeodesicPoint[];
  outcome: "captured" | "scattered" | "critical";
  deflectionDegrees: number | null;
  closestRadius: number;
}

type OrbitState = [radius: number, radialVelocity: number, phi: number];

function addScaled(
  state: OrbitState,
  derivative: OrbitState,
  scale: number,
): OrbitState {
  return [
    state[0] + derivative[0] * scale,
    state[1] + derivative[1] * scale,
    state[2] + derivative[2] * scale,
  ];
}

function rk4Step(
  state: OrbitState,
  step: number,
  derivative: (current: OrbitState) => OrbitState,
): OrbitState {
  const k1 = derivative(state);
  const k2 = derivative(addScaled(state, k1, step / 2));
  const k3 = derivative(addScaled(state, k2, step / 2));
  const k4 = derivative(addScaled(state, k3, step));
  return [
    state[0] + (step / 6) * (k1[0] + 2 * k2[0] + 2 * k3[0] + k4[0]),
    state[1] + (step / 6) * (k1[1] + 2 * k2[1] + 2 * k3[1] + k4[1]),
    state[2] + (step / 6) * (k1[2] + 2 * k2[2] + 2 * k3[2] + k4[2]),
  ];
}

function toPoint(state: OrbitState): GeodesicPoint {
  const [radius, , phi] = state;
  return {
    x: radius * Math.cos(phi),
    y: radius * Math.sin(phi),
    r: radius,
    phi,
  };
}

/**
 * Backward/forward ray tracing in the Schwarzschild equatorial plane. The
 * exact null radial equation is integrated with affine parameter λ:
 *   r¨ = L²/r³ - 3L²/(2r⁴),  φ˙ = L/r².
 * Radii and impact parameters are measured in Schwarzschild radii.
 */
export function traceNullGeodesic(impactParameter: number): NullGeodesicResult {
  const startX = -24;
  const startY = impactParameter;
  const initialRadius = Math.hypot(startX, startY);
  const angularMomentum = -impactParameter;
  const radialPotential =
    1 -
    ((1 - 1 / initialRadius) * (angularMomentum * angularMomentum)) /
      (initialRadius * initialRadius);
  let state: OrbitState = [
    initialRadius,
    -Math.sqrt(Math.max(radialPotential, 0)),
    Math.atan2(startY, startX),
  ];
  const step = 0.008;
  const isCritical =
    Math.abs(impactParameter - CRITICAL_PHOTON_IMPACT) < 0.00001;
  const points: GeodesicPoint[] = [toPoint(state)];
  let closestRadius = initialRadius;
  let outcome: NullGeodesicResult["outcome"] = "critical";

  const derivative = ([radius, radialVelocity]: OrbitState): OrbitState => {
    const safeRadius = Math.max(radius, 0.92);
    const l2 = angularMomentum * angularMomentum;
    return [
      radialVelocity,
      l2 / safeRadius ** 3 - (1.5 * l2) / safeRadius ** 4,
      angularMomentum / safeRadius ** 2,
    ];
  };

  for (let index = 0; index < 32_000; index += 1) {
    state = rk4Step(state, step, derivative);
    if (!state.every(Number.isFinite)) break;
    closestRadius = Math.min(closestRadius, state[0]);
    if (index % 7 === 0) points.push(toPoint(state));

    // The critical orbit is a separatrix: a ray from infinity approaches
    // r = 1.5 r_s only as λ → ∞. Stop once it has numerically converged rather
    // than letting accumulated floating-point error choose capture or escape.
    if (isCritical && state[0] < 1.5005) {
      points.push(toPoint(state));
      closestRadius = 1.5;
      outcome = "critical";
      break;
    }

    if (state[0] <= 1.002) {
      points.push(toPoint(state));
      outcome = "captured";
      break;
    }

    const point = toPoint(state);
    if (index > 100 && point.x > 24 && state[1] > 0) {
      points.push(point);
      outcome = "scattered";
      break;
    }
  }

  let deflectionDegrees: number | null = null;
  if (outcome === "scattered" && points.length > 3) {
    const last = points.at(-1);
    const before = points.at(-4);
    if (last && before) {
      deflectionDegrees =
        (Math.abs(Math.atan2(last.y - before.y, last.x - before.x)) * 180) /
        Math.PI;
    }
  }

  return { points, outcome, deflectionDegrees, closestRadius };
}

export interface TimelikeGeodesicResult {
  points: GeodesicPoint[];
  energy: number;
  angularMomentum: number;
  periapsis: number;
  apoapsis: number;
  precessionDegrees: number | null;
}

/**
 * Bound timelike Schwarzschild geodesic from Darwin parameters p and e.
 * p is expressed in GM/c² and radii are returned in r_s = 2GM/c².
 */
export function traceTimelikeGeodesic(
  semiLatusRectum: number,
  eccentricity: number,
): TimelikeGeodesicResult {
  const e = Math.min(Math.max(eccentricity, 0), 0.78);
  const p = Math.max(semiLatusRectum, 6 + 2 * e + 0.05);
  const energySquared =
    ((p - 2 - 2 * e) * (p - 2 + 2 * e)) / (p * (p - 3 - e * e));
  const angularMomentum = Math.sqrt((0.25 * p * p) / (p - 3 - e * e));
  const periapsis = p / (2 * (1 + e));
  const apoapsis = p / (2 * (1 - e));
  let state: OrbitState = [periapsis, 0, 0];
  const step = 0.018;
  const points: GeodesicPoint[] = [toPoint(state)];
  const pericenterAngles = [0];
  let previousRadialVelocity = 0;

  const derivative = ([radius, radialVelocity]: OrbitState): OrbitState => {
    const safeRadius = Math.max(radius, 1.001);
    const l2 = angularMomentum * angularMomentum;
    return [
      radialVelocity,
      -0.5 / safeRadius ** 2 +
        l2 / safeRadius ** 3 -
        (1.5 * l2) / safeRadius ** 4,
      angularMomentum / safeRadius ** 2,
    ];
  };

  for (let index = 0; index < 42_000; index += 1) {
    state = rk4Step(state, step, derivative);
    if (!state.every(Number.isFinite) || state[0] <= 1.002) break;
    if (index % 5 === 0) points.push(toPoint(state));

    if (previousRadialVelocity < 0 && state[1] >= 0) {
      pericenterAngles.push(state[2]);
      if (pericenterAngles.length === 4) {
        points.push(toPoint(state));
        break;
      }
    }
    previousRadialVelocity = state[1];
  }

  const advances = pericenterAngles
    .slice(1)
    .map((angle, index) => angle - pericenterAngles[index] - 2 * Math.PI);
  const averageAdvance = advances.length
    ? advances.reduce((sum, value) => sum + value, 0) / advances.length
    : null;

  return {
    points,
    energy: Math.sqrt(energySquared),
    angularMomentum,
    periapsis,
    apoapsis,
    precessionDegrees:
      averageAdvance === null ? null : (averageAdvance * 180) / Math.PI,
  };
}

export interface BinaryParameters {
  totalMass: number;
  symmetricMassRatio: number;
  chirpMass: number;
  orbitalFrequencyHz: number;
  gravitationalWaveFrequencyHz: number;
  strainAmplitude: number;
  timeToMergerSeconds: number;
  separationKm: number;
}

export interface InspiralWaveform {
  /** Physical source-frame time in seconds from release. */
  t: number[];
  /** Deliberately slowed display time used by the synchronized UI and audio. */
  playbackTime: number[];
  hPlus: number[];
  hCross: number[];
  amplitude: number[];
  fGW: number[];
  separation: number[];
  orbitalPhase: number[];
  mergerIndex: number;
  mergerPlaybackTime: number;
  duration: number;
  physicalInspiralDuration: number;
  finalMass: number;
  radiatedMass: number;
  ringdownFrequencyHz: number;
}

/** Leading-order, quasi-circular binary parameters (quadrupole + Peters). */
export function getBinaryParameters(
  massOneSolar: number,
  massTwoSolar: number,
  separationInTotalMassRadii: number,
  distanceMegaparsecs: number,
): BinaryParameters {
  const totalMass = massOneSolar + massTwoSolar;
  const symmetricMassRatio =
    (massOneSolar * massTwoSolar) / (totalMass * totalMass);
  const chirpMass =
    (massOneSolar * massTwoSolar) ** (3 / 5) / totalMass ** (1 / 5);
  const totalMassSeconds = totalMass * SOLAR_MASS_TIME_SECONDS;
  const orbitalFrequencyHz =
    1 / (2 * Math.PI * totalMassSeconds * separationInTotalMassRadii ** 1.5);
  const gravitationalWaveFrequencyHz = 2 * orbitalFrequencyHz;
  const distanceMeters = distanceMegaparsecs * 1e6 * PARSEC_METERS;
  const chirpMassKg = chirpMass * SOLAR_MASS_KG;
  const strainAmplitude =
    (4 *
      (GRAVITATIONAL_CONSTANT * chirpMassKg) ** (5 / 3) *
      (Math.PI * gravitationalWaveFrequencyHz) ** (2 / 3)) /
    (SPEED_OF_LIGHT ** 4 * distanceMeters);
  const timeToMergerSeconds =
    ((5 / 256) * totalMassSeconds * separationInTotalMassRadii ** 4) /
    symmetricMassRatio;

  return {
    totalMass,
    symmetricMassRatio,
    chirpMass,
    orbitalFrequencyHz,
    gravitationalWaveFrequencyHz,
    strainAmplitude,
    timeToMergerSeconds,
    separationKm: separationInTotalMassRadii * totalMass * SOLAR_MASS_LENGTH_KM,
  };
}

/** Exact leading-order Peters solution for a quasi-circular inspiral. */
export function inspiralSeparation(
  initialSeparation: number,
  symmetricMassRatio: number,
  elapsedInTotalMassTimes: number,
) {
  const remaining =
    initialSeparation ** 4 -
    (256 / 5) * symmetricMassRatio * elapsedInTotalMassTimes;
  return remaining <= 0 ? 0 : remaining ** 0.25;
}

/**
 * A compact inspiral-merger-ringdown teaching waveform. The inspiral is the
 * leading-order Peters/quadrupole solution already used by the lab. It stops
 * at a = 3 GM/c², where that approximation ceases to be trustworthy, and is
 * joined continuously to a phenomenological damped ringdown calibrated to
 * GW150914. This is not a numerical-relativity merger model.
 */
export function buildInspiralWaveform(
  massOneSolar: number,
  massTwoSolar: number,
  initialSeparation: number,
  distanceMegaparsecs: number,
  inclinationDegrees: number,
): InspiralWaveform {
  const totalMass = massOneSolar + massTwoSolar;
  const eta = (massOneSolar * massTwoSolar) / totalMass ** 2;
  const totalMassSeconds = totalMass * SOLAR_MASS_TIME_SECONDS;
  const mergerSeparation = Math.min(3, initialSeparation * 0.9);
  const physicalInspiralDuration = Math.max(
    0,
    ((5 / 256) *
      totalMassSeconds *
      (initialSeparation ** 4 - mergerSeparation ** 4)) /
      eta,
  );
  const finalMass = totalMass * 0.954;
  const radiatedMass = totalMass - finalMass;
  const ringdownFrequencyHz = 250 * (62 / finalMass);
  const ringdownTau = 0.004 * (finalMass / 62);
  const ringdownPhysicalDuration = Math.max(0.02, ringdownTau * 5);
  const inspiralPlaybackDuration = 9.5;
  const ringdownPlaybackDuration = 1.5;
  const inspiralSamples = 1200;
  const ringdownSamples = 180;
  const finalSlowWindow = Math.min(0.1, physicalInspiralDuration * 0.45);
  const slowWindowStart = Math.max(
    0,
    physicalInspiralDuration - finalSlowWindow,
  );
  const slowPlaybackStart = inspiralPlaybackDuration * 0.68;
  const cosInclination = Math.cos((inclinationDegrees * Math.PI) / 180);
  const plusProjection = (1 + cosInclination ** 2) / 2;

  const t: number[] = [];
  const playbackTime: number[] = [];
  const fGW: number[] = [];
  const separation: number[] = [];
  const amplitude: number[] = [];
  const rawWavePhase: number[] = [];
  let phase = 0;
  let previousPhysicalTime = 0;

  for (let index = 0; index < inspiralSamples; index += 1) {
    const progress = index / (inspiralSamples - 1);
    const displayTime = progress * inspiralPlaybackDuration;
    const physicalTime =
      displayTime <= slowPlaybackStart || finalSlowWindow === 0
        ? (displayTime / slowPlaybackStart) * slowWindowStart
        : slowWindowStart +
          ((displayTime - slowPlaybackStart) /
            (inspiralPlaybackDuration - slowPlaybackStart)) *
            finalSlowWindow;
    const currentSeparation = Math.max(
      mergerSeparation,
      inspiralSeparation(
        initialSeparation,
        eta,
        physicalTime / totalMassSeconds,
      ),
    );
    const binary = getBinaryParameters(
      massOneSolar,
      massTwoSolar,
      currentSeparation,
      distanceMegaparsecs,
    );
    if (index > 0) {
      const dt = physicalTime - previousPhysicalTime;
      const previousFrequency =
        fGW[index - 1] ?? binary.gravitationalWaveFrequencyHz;
      phase +=
        Math.PI *
        (previousFrequency + binary.gravitationalWaveFrequencyHz) *
        dt;
    }
    previousPhysicalTime = physicalTime;
    t.push(physicalTime);
    playbackTime.push(displayTime);
    fGW.push(binary.gravitationalWaveFrequencyHz);
    separation.push(currentSeparation);
    amplitude.push(binary.strainAmplitude);
    rawWavePhase.push(phase);
  }

  // Choose an arbitrary global phase that places a strain crest at merger.
  // Only phase differences are observable here, and this makes the analytic
  // inspiral and ringdown value-continuous at their join.
  const mergerPhaseOffset = rawWavePhase.at(-1) ?? 0;
  const hPlus = rawWavePhase.map(
    (value, index) =>
      (amplitude[index] ?? 0) *
      plusProjection *
      Math.cos(value - mergerPhaseOffset),
  );
  const hCross = rawWavePhase.map(
    (value, index) =>
      (amplitude[index] ?? 0) *
      cosInclination *
      Math.sin(value - mergerPhaseOffset),
  );
  const orbitalPhase = rawWavePhase.map(
    (value) => (value - mergerPhaseOffset) / 2,
  );
  const mergerIndex = hPlus.length - 1;
  const mergerAmplitude = amplitude[mergerIndex] ?? 0;
  const mergerFrequency = fGW[mergerIndex] ?? ringdownFrequencyHz;
  let ringdownPhase = 0;
  let previousRingdownTime = 0;

  for (let index = 1; index <= ringdownSamples; index += 1) {
    const progress = index / ringdownSamples;
    const ringdownTime = progress * ringdownPhysicalDuration;
    const displayTime =
      inspiralPlaybackDuration + progress * ringdownPlaybackDuration;
    const frequency =
      mergerFrequency +
      (ringdownFrequencyHz - mergerFrequency) *
        (1 - Math.exp(-ringdownTime / Math.max(ringdownTau * 0.45, 1e-6)));
    const dt = ringdownTime - previousRingdownTime;
    const previousFrequency = fGW.at(-1) ?? mergerFrequency;
    ringdownPhase += Math.PI * (previousFrequency + frequency) * dt;
    previousRingdownTime = ringdownTime;
    const envelope = mergerAmplitude * Math.exp(-ringdownTime / ringdownTau);
    t.push(physicalInspiralDuration + ringdownTime);
    playbackTime.push(displayTime);
    fGW.push(frequency);
    separation.push(0);
    amplitude.push(envelope);
    hPlus.push(envelope * plusProjection * Math.cos(ringdownPhase));
    hCross.push(envelope * cosInclination * Math.sin(ringdownPhase));
    orbitalPhase.push(ringdownPhase / 2);
  }

  return {
    t,
    playbackTime,
    hPlus,
    hCross,
    amplitude,
    fGW,
    separation,
    orbitalPhase,
    mergerIndex,
    mergerPlaybackTime: inspiralPlaybackDuration,
    duration: inspiralPlaybackDuration + ringdownPlaybackDuration,
    physicalInspiralDuration,
    finalMass,
    radiatedMass,
    ringdownFrequencyHz,
  };
}
