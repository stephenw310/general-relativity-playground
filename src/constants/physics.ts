// Physics constants (scaled for visualization)
export const G = 1.0; // Gravitational constant (scaled for visual effect)
export const C = 1.0; // Speed of light (scaled for visual effect)

// Weak-field surface visualization. The shader plots the dimensionless
// Schwarzschild perturbation 2GM/(c²r), softened near each object's center.
export const SPACETIME_SOFTENING_RADIUS = 0.75;

// Rendering-only vertical gain. This exaggerates the embedding surface so its
// shape is legible on screen; it is not a physical constant.
export const SPACETIME_VERTICAL_EXAGGERATION = 0.72;

// Mass configuration (in solar masses)
export const MASS_DEFAULT_VALUE = 1.0; // 1 solar mass
export const MASS_MIN_VALUE = 0.5; // 0.5 solar masses (minimum for realistic curvature)
export const MASS_MAX_VALUE = 10.0; // 10 solar masses (stellar black hole)
export const MASS_STEP = 0.5;

// Collision configuration
export const MASS_COLLISION_BUFFER = 0.3; // Buffer space between mass visual boundaries
export const COLLISION_RESOLUTION_ITERATIONS = 3; // Max iterations for resolving complex collisions
