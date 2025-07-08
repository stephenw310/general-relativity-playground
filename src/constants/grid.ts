// Grid configuration
export const GRID_SIZE = 20;
export const GRID_RESOLUTION = 128;
export const GRID_MAX_BOUNDS = 9.5;

// Performance optimization
export const GRID_RESOLUTION_BY_MASS_COUNT = {
  low: 64, // <= 2 masses
  medium: 96, // <= 4 masses
  high: 128, // > 4 masses
} as const;

// Shader configuration
export const MAX_MASSES_DEFAULT = 16;
export const MAX_MASSES_MIN = 4;

// Drag configuration
export const DRAG_BOUNDS_SAFE = 8;
export const DRAG_BOUNDS_MAX = 9.5; // GRID_MAX_BOUNDS
