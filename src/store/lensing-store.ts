import { create } from "zustand";
import {
  EXTERNAL_SHEAR_DEFAULT,
  HALO_FRACTION_DEFAULT,
  LENS_MASS_DEFAULT,
  SOURCE_POSITION_LIMIT,
  SOURCE_SIZE_DEFAULT,
  SOURCE_X_DEFAULT,
  SOURCE_Y_DEFAULT,
  STELLAR_ELLIPTICITY_DEFAULT,
} from "@/constants";
import type { LensingStoreState } from "@/types";

const initialState = {
  lensMass: LENS_MASS_DEFAULT,
  sourceX: SOURCE_X_DEFAULT,
  sourceY: SOURCE_Y_DEFAULT,
  sourceSize: SOURCE_SIZE_DEFAULT,
  stellarEllipticity: STELLAR_ELLIPTICITY_DEFAULT,
  haloFraction: HALO_FRACTION_DEFAULT,
  externalShear: EXTERNAL_SHEAR_DEFAULT,
  showSubstructure: false,
  showLensGalaxy: true,
  showGuides: true,
};

function clampSourcePosition(value: number) {
  return Math.max(
    -SOURCE_POSITION_LIMIT,
    Math.min(SOURCE_POSITION_LIMIT, value),
  );
}

export const useLensingStore = create<LensingStoreState>()((set) => ({
  ...initialState,

  setLensMass: (lensMass) => set({ lensMass }),
  setSourcePosition: (sourceX, sourceY) =>
    set({
      sourceX: clampSourcePosition(sourceX),
      sourceY: clampSourcePosition(sourceY),
    }),
  setSourceSize: (sourceSize) => set({ sourceSize }),
  setStellarEllipticity: (stellarEllipticity) => set({ stellarEllipticity }),
  setHaloFraction: (haloFraction) => set({ haloFraction }),
  setExternalShear: (externalShear) => set({ externalShear }),
  setShowSubstructure: (showSubstructure) => set({ showSubstructure }),
  setShowLensGalaxy: (showLensGalaxy) => set({ showLensGalaxy }),
  setShowGuides: (showGuides) => set({ showGuides }),
  reset: () => set(initialState),
}));

export const useLensMass = () => useLensingStore((state) => state.lensMass);
export const useLensSourceX = () => useLensingStore((state) => state.sourceX);
export const useLensSourceY = () => useLensingStore((state) => state.sourceY);
export const useLensSourceSize = () =>
  useLensingStore((state) => state.sourceSize);
export const useStellarEllipticity = () =>
  useLensingStore((state) => state.stellarEllipticity);
export const useHaloFraction = () =>
  useLensingStore((state) => state.haloFraction);
export const useExternalShear = () =>
  useLensingStore((state) => state.externalShear);
export const useShowSubstructure = () =>
  useLensingStore((state) => state.showSubstructure);
export const useShowLensGalaxy = () =>
  useLensingStore((state) => state.showLensGalaxy);
export const useShowLensGuides = () =>
  useLensingStore((state) => state.showGuides);

export const useSetLensMass = () =>
  useLensingStore((state) => state.setLensMass);
export const useSetLensSourcePosition = () =>
  useLensingStore((state) => state.setSourcePosition);
export const useSetLensSourceSize = () =>
  useLensingStore((state) => state.setSourceSize);
export const useSetStellarEllipticity = () =>
  useLensingStore((state) => state.setStellarEllipticity);
export const useSetHaloFraction = () =>
  useLensingStore((state) => state.setHaloFraction);
export const useSetExternalShear = () =>
  useLensingStore((state) => state.setExternalShear);
export const useSetShowSubstructure = () =>
  useLensingStore((state) => state.setShowSubstructure);
export const useSetShowLensGalaxy = () =>
  useLensingStore((state) => state.setShowLensGalaxy);
export const useSetShowLensGuides = () =>
  useLensingStore((state) => state.setShowGuides);
export const useResetLensing = () => useLensingStore((state) => state.reset);
