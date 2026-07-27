"use client";

import { useControls, button } from "leva";
import {
  useMasses,
  useAddMass,
  useUpdateMassValue,
  useUpdateCosmicType,
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
import {
  type CosmicObjectType,
  COSMIC_MASS_PRESETS,
} from "@/utils/cosmic-textures";

export function Controls() {
  const masses = useMasses();
  const addMass = useAddMass();
  const updateMassValue = useUpdateMassValue();
  const updateCosmicType = useUpdateCosmicType();
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
    const cosmicTypeOptions = {
      "⚪ White Dwarf (0.6 M☉)": "white_dwarf" as CosmicObjectType,
      "🔵 Neutron Star (1.4 M☉)": "neutron_star" as CosmicObjectType,
      "💫 Pulsar (1.97 M☉)": "pulsar" as CosmicObjectType,
      "⭐ Star (2.5 M☉)": "star" as CosmicObjectType,
      "🔴 Red Giant (8.0 M☉)": "red_giant" as CosmicObjectType,
      "🛠️ Custom": "custom" as CosmicObjectType,
    };

    // Controls are keyed by mass id so leva's persisted state can never
    // cross-wire between masses when one is removed; label carries the
    // user-facing positional name.
    return masses.reduce(
      (controls, mass, index) => {
        const massLabel = `Mass ${index + 1}`;
        // Only show mass slider for custom type
        if (mass.cosmicType === "custom") {
          controls[`mass-${mass.id}-value`] = {
            label: `${massLabel} (M☉)`,
            value: mass.mass,
            min: MASS_MIN_VALUE,
            max: MASS_MAX_VALUE,
            step: MASS_STEP,
            onChange: (value: number) => {
              updateMassValue(mass.id, value);
            },
          };
        }

        controls[`mass-${mass.id}-type`] = {
          label: `${massLabel} Type`,
          value: mass.cosmicType || "custom",
          options: cosmicTypeOptions,
          onChange: (value: CosmicObjectType) => {
            updateCosmicType(mass.id, value);
            // If it's not custom, also update the mass to the preset value
            if (value !== "custom") {
              const presetMass = COSMIC_MASS_PRESETS[value];
              updateMassValue(mass.id, presetMass);
            }
          },
        };

        controls[`Remove ${massLabel}`] = button(() => {
          removeMass(mass.id);
        });
        return controls;
      },
      {} as Record<string, unknown>,
    );
  }, [masses, updateMassValue, updateCosmicType, removeMass]);

  // Rebuild the leva schema only on structural changes (ids, types) — never
  // on mass value ticks, which used to tear down the slider mid-drag
  const massControlsKey = useMemo(() => {
    return masses.map((m) => `${m.id}-${m.cosmicType}`).join("|");
  }, [masses]);

  useControls("Mass Controls", massControls, { collapsed: false }, [
    massControlsKey,
  ]);

  return null;
}
