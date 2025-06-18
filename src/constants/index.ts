// Grid configuration
export const GRID_SIZE = 20;
export const GRID_RESOLUTION = 128;
export const GRID_MAX_BOUNDS = 9.5;

// Mass configuration
export const MASS_DEFAULT_VALUE = 1.0;
export const MASS_MIN_VALUE = 0.1;
export const MASS_MAX_VALUE = 5.0;
export const MASS_STEP = 0.1;
export const MASS_SPHERE_RADIUS = 0.3;
export const MASS_SPHERE_SEGMENTS = 16;
export const MASS_Z_POSITION = 0.5;

// Warp configuration
export const WARP_STRENGTH_DEFAULT = 2.0;
export const WARP_STRENGTH_MIN = 0.1;
export const WARP_STRENGTH_MAX = 5.0;
export const WARP_STRENGTH_STEP = 0.1;
export const WARP_EPSILON = 0.5;

// Shader configuration
export const MAX_MASSES_DEFAULT = 16;
export const MAX_MASSES_MIN = 4;

// Drag configuration
export const DRAG_BOUNDS_SAFE = 8;
export const DRAG_BOUNDS_MAX = GRID_MAX_BOUNDS;

// Camera configuration
export const CAMERA_POSITION: [number, number, number] = [0, 12, 12];
export const CAMERA_FOV = 50;
export const CAMERA_MIN_DISTANCE = 8;
export const CAMERA_MAX_DISTANCE = 25;
export const CAMERA_MAX_POLAR_ANGLE = Math.PI / 2.2;

// UI scaling
export const MASS_SCALE_DEFAULT = 1.0;
export const MASS_SCALE_HOVERED = 1.1;
export const MASS_SCALE_SELECTED = 1.2;

// Colors
export const MASS_COLOR_DEFAULT = "#4ecdc4";
export const MASS_COLOR_SELECTED = "#ff6b6b";
export const MASS_COLOR_HOVERED = "#ff6b6b";

// Performance optimization
export const GRID_RESOLUTION_BY_MASS_COUNT = {
  low: 64, // <= 2 masses
  medium: 96, // <= 4 masses
  high: 128, // > 4 masses
} as const;

export const EMISSIVE_INTENSITY = 0.2;
