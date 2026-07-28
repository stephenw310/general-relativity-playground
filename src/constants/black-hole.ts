// Black hole configuration (natural units, G = c = 1)
// World scale chosen so the default mass gives a Schwarzschild radius of
// exactly 1 world unit: rs = mass * SCHWARZSCHILD_SCALE
export const BH_MASS_DEFAULT = 10; // solar masses
export const BH_MASS_MIN = 5;
export const BH_MASS_MAX = 30;
export const BH_MASS_STEP = 1;
export const SCHWARZSCHILD_SCALE = 0.1;

// Characteristic radii as multiples of rs
export const PHOTON_SPHERE_FACTOR = 1.5;
export const DISK_INNER_FACTOR = 3; // ISCO
export const DISK_OUTER_FACTOR = 8;
export const SHADOW_FACTOR = 2.6; // photon capture impact parameter, 3*sqrt(3)/2

// Lensing
export const LENS_STRENGTH_DEFAULT = 1;
export const LENS_STRENGTH_MAX = 2;

// Accretion disk
export const DISK_SPEED_DEFAULT = 1;
export const DISK_SPEED_MAX = 3;

// Camera
export const BH_CAMERA_POSITION: [number, number, number] = [0, 4, 14];
export const BH_CAMERA_FOV = 60;
// Orbit limits are multiples of rs, not fixed world units: every feature in
// the scene scales with rs, so fixed limits let the camera end up inside the
// disk (outer edge 8 rs) or even inside the shadow at high mass.
export const BH_CAMERA_MIN_DISTANCE_FACTOR = 10; // clears DISK_OUTER_FACTOR
export const BH_CAMERA_MAX_DISTANCE_FACTOR = 60;
export const BH_MAX_POLAR_ANGLE = Math.PI - 0.35;

// Star field quality presets
export const BH_STAR_COUNT_LOW = 25000;
export const BH_STAR_COUNT_HIGH = 80000;
