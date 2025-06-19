// Grid configuration
export const GRID_SIZE = 20;
export const GRID_RESOLUTION = 128;
export const GRID_MAX_BOUNDS = 9.5;

// Mass configuration (in solar masses)
export const MASS_DEFAULT_VALUE = 1.0; // 1 solar mass
export const MASS_MIN_VALUE = 0.5; // 0.5 solar masses (minimum for realistic curvature)
export const MASS_MAX_VALUE = 10.0; // 10 solar masses (stellar black hole)
export const MASS_STEP = 0.5;
export const MASS_SPHERE_RADIUS = 1;
export const MASS_SPHERE_SEGMENTS = 16;
export const MASS_Z_POSITION = 0;

// Collision configuration
export const MASS_COLLISION_BUFFER = 0.3; // Buffer space between mass visual boundaries
export const COLLISION_RESOLUTION_ITERATIONS = 3; // Max iterations for resolving complex collisions

// Physics constants (scaled for visualization)
export const G = 1.0; // Gravitational constant (scaled for visual effect)
export const C = 1.0; // Speed of light (scaled for visual effect)

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
export const CAMERA_MAX_DISTANCE = 35;
export const CAMERA_MAX_POLAR_ANGLE = Math.PI / 2.2;

// Camera panning bounds (matches grid extents)
export const CAMERA_PAN_BOUNDS = GRID_MAX_BOUNDS;

// Clamp camera target Y to keep near the plane
export const CAMERA_PAN_BOUNDS_Y = 0;

// UI scaling
export const MASS_SCALE_DEFAULT = 1.0;
export const MASS_SCALE_HOVERED = 1.0;
export const MASS_SCALE_SELECTED = 1.0;

// Mass-proportional scaling
export const MASS_SCALE_MIN = 0.5; // Visual scale for minimum mass (0.1)
export const MASS_SCALE_MAX = 2.0; // Visual scale for maximum mass (5.0)

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
