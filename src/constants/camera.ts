// Camera configuration
export const CAMERA_POSITION: [number, number, number] = [0, 12, 12];
export const CAMERA_FOV = 50;
export const CAMERA_MIN_DISTANCE = 8;
export const CAMERA_MAX_DISTANCE = 35;
export const CAMERA_MAX_POLAR_ANGLE = Math.PI / 2.2;

// Camera panning bounds (matches grid extents)
export const CAMERA_PAN_BOUNDS = 9.5; // GRID_MAX_BOUNDS

// Clamp camera target Y to keep near the plane
export const CAMERA_PAN_BOUNDS_Y = 0;
