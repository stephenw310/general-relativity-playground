"use client";

import { useControls, button } from "leva";
import {
  useMasses,
  useWarpStrength,
  useAddMass,
  useUpdateMassValue,
  useRemoveMass,
  useSetWarpStrength,
  useReset,
} from "@/store/store";
import { useMemo, useCallback } from "react";
import {
  DRAG_BOUNDS_SAFE,
  WARP_STRENGTH_MIN,
  WARP_STRENGTH_MAX,
  WARP_STRENGTH_STEP,
  MASS_MIN_VALUE,
  MASS_MAX_VALUE,
  MASS_STEP,
} from "@/constants";

export function Controls() {
  const masses = useMasses();
  const warpStrength = useWarpStrength();
  const addMass = useAddMass();
  const updateMassValue = useUpdateMassValue();
  const removeMass = useRemoveMass();
  const setWarpStrength = useSetWarpStrength();
  const reset = useReset();

  // Memoized handlers to prevent unnecessary re-renders
  const handleAddMass = useCallback(() => {
    // Add mass at a random position within safe boundaries
    const x = (Math.random() - 0.5) * (DRAG_BOUNDS_SAFE * 1.6);
    const y = (Math.random() - 0.5) * (DRAG_BOUNDS_SAFE * 1.6);
    addMass([x, y]);
  }, [addMass]);

  const handleWarpStrengthChange = useCallback(
    (value: number) => {
      setWarpStrength(value);
    },
    [setWarpStrength],
  );

  // Global controls
  useControls(
    "Global",
    {
      "Add Mass": button(handleAddMass),
      "Warp Strength": {
        value: warpStrength,
        min: WARP_STRENGTH_MIN,
        max: WARP_STRENGTH_MAX,
        step: WARP_STRENGTH_STEP,
        onChange: handleWarpStrengthChange,
      },
      "Reset Scene": button(reset),
    },
    [warpStrength],
  );

  // Simplified mass controls - only recreate when masses array changes structure
  const massControls = useMemo(() => {
    return masses.reduce(
      (controls, mass, index) => {
        const massKey = `Mass ${index + 1}`;
        controls[`${massKey} Value`] = {
          value: mass.mass,
          min: MASS_MIN_VALUE,
          max: MASS_MAX_VALUE,
          step: MASS_STEP,
          onChange: (value: number) => {
            updateMassValue(mass.id, value);
          },
        };

        controls[`Remove ${massKey}`] = button(() => {
          removeMass(mass.id);
        });
        return controls;
      },
      {} as Record<string, unknown>,
    );
  }, [masses, updateMassValue, removeMass]);

  // Simplified dependency key - only mass count and IDs matter for structure
  const massControlsKey = useMemo(() => {
    return masses.map((m) => `${m.id}-${m.mass.toFixed(1)}`).join("|");
  }, [masses]);

  useControls("Mass Controls", massControls, { collapsed: false }, [
    massControlsKey,
  ]);

  return null;
}
