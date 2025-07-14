import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import { StoreState } from "@/types";
import { MASS_DEFAULT_VALUE } from "@/constants";
import { type CosmicObjectType } from "@/utils/cosmic-textures";

const initialState = {
  masses: [
    {
      id: "1",
      position: [0, 0] as [number, number],
      mass: MASS_DEFAULT_VALUE,
      cosmicType: "custom" as CosmicObjectType,
    },
  ],
  selectedMassId: null,
  isDragging: false,
};

export const useStore = create<StoreState>()(
  subscribeWithSelector((set, get) => ({
    ...initialState,

    addMass: (position, cosmicType) =>
      set((state) => {
        const newMass = {
          id: Math.random().toString(36).substring(2, 11),
          position,
          mass: MASS_DEFAULT_VALUE,
          cosmicType: cosmicType || "custom",
        };
        return { masses: [...state.masses, newMass] };
      }),

    removeMass: (id) =>
      set((state) => {
        const masses = state.masses.filter((m) => m.id !== id);
        const selectedMassId =
          state.selectedMassId === id ? null : state.selectedMassId;
        return { masses, selectedMassId };
      }),

    updateMassPosition: (id, position) =>
      set((state) => {
        const massIndex = state.masses.findIndex((m) => m.id === id);
        if (massIndex === -1) return state;

        const masses = [...state.masses];
        masses[massIndex] = { ...masses[massIndex], position };
        return { masses };
      }),

    updateMassValue: (id, mass) =>
      set((state) => {
        const massIndex = state.masses.findIndex((m) => m.id === id);
        if (massIndex === -1) return state;

        const masses = [...state.masses];
        masses[massIndex] = { ...masses[massIndex], mass };
        return { masses };
      }),

    updateCosmicType: (id, cosmicType) =>
      set((state) => {
        const massIndex = state.masses.findIndex((m) => m.id === id);
        if (massIndex === -1) return state;

        const masses = [...state.masses];
        masses[massIndex] = { ...masses[massIndex], cosmicType };
        return { masses };
      }),

    selectMass: (id) => set({ selectedMassId: id }),

    setIsDragging: (dragging) => set({ isDragging: dragging }),

    reset: () => set(initialState),

    // Optimized selectors
    getMassById: (id) => get().masses.find((m) => m.id === id),
    getMassCount: () => get().masses.length,
  })),
);

// Core state selectors
export const useMasses = () => useStore((state) => state.masses);
export const useSelectedMassId = () =>
  useStore((state) => state.selectedMassId);
export const useIsDragging = () => useStore((state) => state.isDragging);

// Individual action selectors (stable references)
export const useAddMass = () => useStore((state) => state.addMass);
export const useRemoveMass = () => useStore((state) => state.removeMass);
export const useUpdateMassPosition = () =>
  useStore((state) => state.updateMassPosition);
export const useUpdateMassValue = () =>
  useStore((state) => state.updateMassValue);
export const useUpdateCosmicType = () =>
  useStore((state) => state.updateCosmicType);
export const useSelectMass = () => useStore((state) => state.selectMass);
export const useSetIsDragging = () => useStore((state) => state.setIsDragging);
export const useReset = () => useStore((state) => state.reset);
