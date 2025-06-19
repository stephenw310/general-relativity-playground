"use client";

import { useControls, button } from "leva";
import {
  useMasses,
  useAddMass,
  useUpdateMassValue,
  useRemoveMass,
  useReset,
} from "@/store/store";
import { useMemo, useCallback } from "react";
import {
  DRAG_BOUNDS_SAFE,
  MASS_MIN_VALUE,
  MASS_MAX_VALUE,
  MASS_STEP,
} from "@/constants";

export function Controls() {
  const masses = useMasses();
  const addMass = useAddMass();
  const updateMassValue = useUpdateMassValue();
  const removeMass = useRemoveMass();
  const reset = useReset();

  // Memoized handlers to prevent unnecessary re-renders
  const handleAddMass = useCallback(() => {
    // Add mass at a random position within safe boundaries
    const x = (Math.random() - 0.5) * (DRAG_BOUNDS_SAFE * 1.6);
    const y = (Math.random() - 0.5) * (DRAG_BOUNDS_SAFE * 1.6);
    addMass([x, y]);
  }, [addMass]);

  // Global controls
  useControls(
    "Global",
    {
      "Add Mass": button(handleAddMass),
      "Reset Scene": button(reset),
    },
    [],
  );

  // Simplified mass controls - only recreate when masses array changes structure
  const massControls = useMemo(() => {
    return masses.reduce(
      (controls, mass, index) => {
        const massKey = `Mass ${index + 1}`;
        controls[`${massKey} (solar masses)`] = {
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
