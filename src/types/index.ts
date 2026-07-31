export interface Mass {
  id: string;
  position: [number, number];
  mass: number;
  cosmicType?: import("@/utils/cosmic-textures").CosmicObjectType;
}

export interface StoreState {
  masses: Mass[];
  selectedMassId: string | null;
  isDragging: boolean;

  // Actions
  addMass: (
    position: [number, number],
    cosmicType?: import("@/utils/cosmic-textures").CosmicObjectType,
  ) => void;
  removeMass: (id: string) => void;
  updateMassPosition: (id: string, position: [number, number]) => void;
  updateMassValue: (id: string, mass: number) => void;
  updateCosmicType: (
    id: string,
    cosmicType: import("@/utils/cosmic-textures").CosmicObjectType,
  ) => void;
  selectMass: (id: string | null) => void;

  setIsDragging: (dragging: boolean) => void;

  reset: () => void;
}

export type BlackHoleQuality = "auto" | "low" | "high";

export interface BlackHoleStoreState {
  mass: number; // solar masses
  showDisk: boolean;
  diskSpeed: number;
  showPhotonSphere: boolean;
  lensingStrength: number;
  quality: BlackHoleQuality;

  // Actions
  setMass: (mass: number) => void;
  setShowDisk: (showDisk: boolean) => void;
  setDiskSpeed: (diskSpeed: number) => void;
  setShowPhotonSphere: (showPhotonSphere: boolean) => void;
  setLensingStrength: (lensingStrength: number) => void;
  setQuality: (quality: BlackHoleQuality) => void;
  reset: () => void;
}

export interface LensingStoreState {
  lensMass: number; // trillions of solar masses
  sourceX: number; // Einstein radii
  sourceY: number; // Einstein radii
  sourceSize: number;
  stellarEllipticity: number;
  haloFraction: number;
  externalShear: number;
  showSubstructure: boolean;
  showLensGalaxy: boolean;
  showGuides: boolean;

  setLensMass: (lensMass: number) => void;
  setSourcePosition: (sourceX: number, sourceY: number) => void;
  setSourceSize: (sourceSize: number) => void;
  setStellarEllipticity: (stellarEllipticity: number) => void;
  setHaloFraction: (haloFraction: number) => void;
  setExternalShear: (externalShear: number) => void;
  setShowSubstructure: (showSubstructure: boolean) => void;
  setShowLensGalaxy: (showLensGalaxy: boolean) => void;
  setShowGuides: (showGuides: boolean) => void;
  reset: () => void;
}

export interface CurvedGridProps {
  masses: Mass[];
  gridSize?: number;
  gridResolution?: number;
}

export interface MassHandleProps {
  mass: Mass;
}

export interface MassHandlesProps {
  masses: Mass[];
}
