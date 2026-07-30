// Grid configuration
export const GRID_SIZE = 28;
export const GRID_RESOLUTION = 160;
export const GRID_MAX_BOUNDS = 13.25;

// Performance optimization
export const GRID_RESOLUTION_BY_MASS_COUNT = {
  low: 96, // <= 2 masses
  medium: 128, // <= 4 masses
  high: 160, // > 4 masses
} as const;

// Shader configuration
export const MAX_MASSES_DEFAULT = 16;

// Drag configuration
export const DRAG_BOUNDS_SAFE = 11.5;
export const DRAG_BOUNDS_MAX = GRID_MAX_BOUNDS;
