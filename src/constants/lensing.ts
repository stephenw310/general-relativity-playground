// Gravitational lensing configuration. The scene uses single-plane inverse ray
// shooting through an extended stellar galaxy, dark-matter halo, tidal shear,
// and optional satellite substructure.
export const LENS_MASS_DEFAULT = 1; // trillions of solar masses
export const LENS_MASS_MIN = 0.2;
export const LENS_MASS_MAX = 5;
export const LENS_MASS_STEP = 0.1;

// Reference angular scale for a lens at 1 Gpc and source at 2 Gpc.
export const EINSTEIN_ANGLE_ARCSEC = 2.85;
export const EINSTEIN_RADIUS_BASE = 0.34;

// Extended mass model.
export const STELLAR_ELLIPTICITY_DEFAULT = 0;
export const STELLAR_ELLIPTICITY_MIN = 0;
export const STELLAR_ELLIPTICITY_MAX = 0.52;
export const STELLAR_ELLIPTICITY_STEP = 0.01;
export const HALO_FRACTION_DEFAULT = 0.62;
export const HALO_FRACTION_MIN = 0.2;
export const HALO_FRACTION_MAX = 0.86;
export const HALO_FRACTION_STEP = 0.01;
export const EXTERNAL_SHEAR_DEFAULT = 0;
export const EXTERNAL_SHEAR_MIN = 0;
export const EXTERNAL_SHEAR_MAX = 0.18;
export const EXTERNAL_SHEAR_STEP = 0.005;

// Source-plane position is expressed in Einstein radii (beta / theta_E).
export const SOURCE_X_DEFAULT = 0;
export const SOURCE_Y_DEFAULT = 0;
export const SOURCE_POSITION_LIMIT = 1.35;
export const SOURCE_SIZE_DEFAULT = 0.075;
export const SOURCE_SIZE_MIN = 0.035;
export const SOURCE_SIZE_MAX = 0.13;
export const SOURCE_SIZE_STEP = 0.005;
