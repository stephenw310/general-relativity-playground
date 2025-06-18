export interface Mass {
  id: string;
  position: [number, number];
  mass: number;
}

export interface StoreState {
  masses: Mass[];
  selectedMassId: string | null;
  warpStrength: number;
  isDragging: boolean;

  // Actions
  addMass: (position: [number, number]) => void;
  removeMass: (id: string) => void;
  updateMassPosition: (id: string, position: [number, number]) => void;
  updateMassValue: (id: string, mass: number) => void;
  selectMass: (id: string | null) => void;

  setWarpStrength: (strength: number) => void;
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
  warpStrength?: number;
}

export interface MassHandleProps {
  mass: Mass;
}

export interface MassHandlesProps {
  masses: Mass[];
}
