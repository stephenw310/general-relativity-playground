// Black hole configuration (natural units, G = c = 1)
// World scale chosen so the default mass gives a Schwarzschild radius of
// exactly 1 world unit: rs = mass * SCHWARZSCHILD_SCALE
export const BH_MASS_DEFAULT = 10; // solar masses
export const BH_MASS_MIN = 5;
export const BH_MASS_MAX = 30;
export const BH_MASS_STEP = 1;
export const SCHWARZSCHILD_SCALE = 0.1;
// Physical Schwarzschild radius for one solar mass: 2GM/c² ≈ 2.953 km.
// The simulation still uses SCHWARZSCHILD_SCALE for world-space rendering.
export const SCHWARZSCHILD_KM_PER_SOLAR_MASS = 2.953;

// Characteristic radii as multiples of rs
export const PHOTON_SPHERE_FACTOR = 1.5;
export const DISK_INNER_FACTOR = 3; // ISCO
export const DISK_OUTER_FACTOR = 8;
export const SHADOW_FACTOR = 2.6; // photon capture impact parameter, 3*sqrt(3)/2

// Lensing
export const LENS_STRENGTH_DEFAULT = 1;
export const LENS_STRENGTH_MIN = 0.5;
export const LENS_STRENGTH_MAX = 1.5;

// Accretion disk
export const DISK_SPEED_DEFAULT = 1;
export const DISK_SPEED_MAX = 3;

// Camera
// The observer stays at a fixed world-space distance so mass changes remain
// visible against the distant background instead of being canceled by zoom.
// This framing keeps the full mass range readable without changing scale.
export const BH_CAMERA_POSITION: [number, number, number] = [0, 22, 77];
export const BH_CAMERA_DISTANCE = Math.hypot(...BH_CAMERA_POSITION);
export const BH_CAMERA_FOV = 30;
export const BH_MAX_POLAR_ANGLE = Math.PI - 0.35;
