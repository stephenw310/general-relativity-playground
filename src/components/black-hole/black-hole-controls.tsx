"use client";

import { useControls } from "leva";
import {
  useSetBlackHoleMass,
  useSetShowDisk,
  useSetDiskSpeed,
  useSetShowPhotonSphere,
  useSetLensingStrength,
  useSetBlackHoleQuality,
} from "@/store/black-hole-store";
import {
  BH_MASS_DEFAULT,
  BH_MASS_MIN,
  BH_MASS_MAX,
  BH_MASS_STEP,
  DISK_SPEED_DEFAULT,
  DISK_SPEED_MAX,
  LENS_STRENGTH_DEFAULT,
  LENS_STRENGTH_MAX,
} from "@/constants";
import type { BlackHoleQuality } from "@/types";

export function BlackHoleControls() {
  const setMass = useSetBlackHoleMass();
  const setShowDisk = useSetShowDisk();
  const setDiskSpeed = useSetDiskSpeed();
  const setShowPhotonSphere = useSetShowPhotonSphere();
  const setLensingStrength = useSetLensingStrength();
  const setQuality = useSetBlackHoleQuality();

  useControls("Black Hole", {
    mass: {
      label: "Mass (M☉)",
      value: BH_MASS_DEFAULT,
      min: BH_MASS_MIN,
      max: BH_MASS_MAX,
      step: BH_MASS_STEP,
      onChange: (value: number) => setMass(value),
    },
    lensing: {
      label: "Lensing",
      value: LENS_STRENGTH_DEFAULT,
      min: 0,
      max: LENS_STRENGTH_MAX,
      step: 0.05,
      onChange: (value: number) => setLensingStrength(value),
    },
    photonSphere: {
      label: "Photon Sphere",
      value: false,
      onChange: (value: boolean) => setShowPhotonSphere(value),
    },
  });

  useControls("Accretion Disk", {
    showDisk: {
      label: "Show Disk",
      value: true,
      onChange: (value: boolean) => setShowDisk(value),
    },
    diskSpeed: {
      label: "Speed",
      value: DISK_SPEED_DEFAULT,
      min: 0,
      max: DISK_SPEED_MAX,
      step: 0.1,
      onChange: (value: number) => setDiskSpeed(value),
    },
  });

  useControls("Scene", {
    quality: {
      label: "Quality",
      value: "auto" as BlackHoleQuality,
      options: {
        Auto: "auto" as BlackHoleQuality,
        Low: "low" as BlackHoleQuality,
        High: "high" as BlackHoleQuality,
      },
      onChange: (value: BlackHoleQuality) => setQuality(value),
    },
  });

  return null;
}
