import { GRID_MAX_BOUNDS } from "./grid";

// Camera configuration
export const CAMERA_POSITION: [number, number, number] = [0, 12, 12];
export const CAMERA_FOV = 75;
export const CAMERA_MIN_DISTANCE = 8;
export const CAMERA_MAX_DISTANCE = 35;
export const CAMERA_MAX_POLAR_ANGLE = Math.PI / 2.2;

// Camera panning bounds (matches grid extents)
export const CAMERA_PAN_BOUNDS = GRID_MAX_BOUNDS;
