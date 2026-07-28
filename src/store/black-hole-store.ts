import { create } from "zustand";
import type { BlackHoleStoreState } from "@/types";
import {
  BH_MASS_DEFAULT,
  DISK_SPEED_DEFAULT,
  LENS_STRENGTH_DEFAULT,
} from "@/constants";

const initialState = {
  mass: BH_MASS_DEFAULT,
  showDisk: true,
  diskSpeed: DISK_SPEED_DEFAULT,
  showPhotonSphere: false,
  lensingStrength: LENS_STRENGTH_DEFAULT,
  quality: "auto" as const,
};

export const useBlackHoleStore = create<BlackHoleStoreState>()((set) => ({
  ...initialState,

  setMass: (mass) => set({ mass }),
  setShowDisk: (showDisk) => set({ showDisk }),
  setDiskSpeed: (diskSpeed) => set({ diskSpeed }),
  setShowPhotonSphere: (showPhotonSphere) => set({ showPhotonSphere }),
  setLensingStrength: (lensingStrength) => set({ lensingStrength }),
  setQuality: (quality) => set({ quality }),
}));

// State selectors
export const useBlackHoleMass = () => useBlackHoleStore((state) => state.mass);
export const useShowDisk = () => useBlackHoleStore((state) => state.showDisk);
export const useDiskSpeed = () => useBlackHoleStore((state) => state.diskSpeed);
export const useShowPhotonSphere = () =>
  useBlackHoleStore((state) => state.showPhotonSphere);
export const useLensingStrength = () =>
  useBlackHoleStore((state) => state.lensingStrength);
export const useBlackHoleQuality = () =>
  useBlackHoleStore((state) => state.quality);

// Action selectors (stable references)
export const useSetBlackHoleMass = () =>
  useBlackHoleStore((state) => state.setMass);
export const useSetShowDisk = () =>
  useBlackHoleStore((state) => state.setShowDisk);
export const useSetDiskSpeed = () =>
  useBlackHoleStore((state) => state.setDiskSpeed);
export const useSetShowPhotonSphere = () =>
  useBlackHoleStore((state) => state.setShowPhotonSphere);
export const useSetLensingStrength = () =>
  useBlackHoleStore((state) => state.setLensingStrength);
export const useSetBlackHoleQuality = () =>
  useBlackHoleStore((state) => state.setQuality);
