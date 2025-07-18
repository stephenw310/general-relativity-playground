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

  // Optimized selectors
  getMassById: (id: string) => Mass | undefined;
  getMassCount: () => number;
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
