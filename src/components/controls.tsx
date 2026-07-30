"use client";

import { useCallback, useMemo, useState } from "react";
import {
  DRAG_BOUNDS_SAFE,
  MASS_MAX_VALUE,
  MASS_MIN_VALUE,
  MASS_STEP,
} from "@/constants";
import {
  useAddMass,
  useMasses,
  useRemoveMass,
  useReset,
  useUpdateCosmicType,
  useUpdateMassValue,
} from "@/store/store";
import {
  COSMIC_MASS_PRESETS,
  type CosmicObjectType,
} from "@/utils/cosmic-textures";

const COSMIC_TYPE_OPTIONS: {
  label: string;
  shortLabel: string;
  value: CosmicObjectType;
}[] = [
  {
    label: "White dwarf · 0.6 solar masses",
    shortLabel: "White dwarf",
    value: "white_dwarf",
  },
  {
    label: "Neutron star · 1.4 solar masses",
    shortLabel: "Neutron star",
    value: "neutron_star",
  },
  {
    label: "Pulsar · 1.97 solar masses",
    shortLabel: "Pulsar",
    value: "pulsar",
  },
  {
    label: "Regular star · 2.5 solar masses",
    shortLabel: "Regular star",
    value: "star",
  },
  {
    label: "Red giant · 8.0 solar masses",
    shortLabel: "Red giant",
    value: "red_giant",
  },
  { label: "Custom", shortLabel: "Custom", value: "custom" },
];

function formatMass(value: number) {
  return Number.isInteger(value) ? value.toFixed(1) : value.toFixed(2);
}

export function Controls() {
  const masses = useMasses();
  const addMass = useAddMass();
  const updateMassValue = useUpdateMassValue();
  const updateCosmicType = useUpdateCosmicType();
  const removeMass = useRemoveMass();
  const reset = useReset();
  const [panelOpen, setPanelOpen] = useState(false);

  const handleAddMass = useCallback(() => {
    const x = (Math.random() - 0.5) * (DRAG_BOUNDS_SAFE * 1.45);
    const y = (Math.random() - 0.5) * (DRAG_BOUNDS_SAFE * 1.45);
    addMass([x, y], "star");
  }, [addMass]);

  const totalMass = useMemo(
    () => masses.reduce((total, mass) => total + mass.mass, 0),
    [masses],
  );

  return (
    <>
      <button
        type="button"
        className="spacetime-objects-toggle"
        onClick={() => setPanelOpen((open) => !open)}
        aria-expanded={panelOpen}
        aria-controls="spacetime-object-controls"
      >
        <span>Objects</span>
        <b>{masses.length}</b>
      </button>

      <aside
        id="spacetime-object-controls"
        className={
          panelOpen ? "is-open spacetime-controls" : "spacetime-controls"
        }
        aria-label="Cosmic object controls"
      >
        <header className="spacetime-controls-header">
          <div>
            <span className="spacetime-panel-kicker">
              Change the conditions
            </span>
            <h2>Objects</h2>
          </div>
          <button
            type="button"
            className="spacetime-panel-close"
            onClick={() => setPanelOpen(false)}
            aria-label="Close object controls"
          >
            ×
          </button>
        </header>

        <div className="spacetime-controls-summary">
          <span>
            <b>{masses.length}</b>
            {masses.length === 1 ? "object" : "objects"}
          </span>
          <span>
            <b>{formatMass(totalMass)}</b>
            solar masses total
          </span>
        </div>

        <div className="spacetime-object-list">
          {masses.length === 0 && (
            <div className="spacetime-empty-state">
              <span aria-hidden="true">＋</span>
              <p>Add an object to begin bending the field.</p>
            </div>
          )}

          {masses.map((mass, index) => {
            const selectedType =
              COSMIC_TYPE_OPTIONS.find(
                (option) => option.value === mass.cosmicType,
              ) ?? COSMIC_TYPE_OPTIONS.at(-1);

            return (
              <section className="spacetime-object" key={mass.id}>
                <div className="spacetime-object-heading">
                  <div>
                    <span className="spacetime-object-index">
                      Object {index + 1}
                    </span>
                    <div>
                      <h3>{selectedType?.shortLabel}</h3>
                      <p>{formatMass(mass.mass)} solar masses</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="spacetime-remove"
                    onClick={() => removeMass(mass.id)}
                    aria-label={`Remove object ${index + 1}`}
                  >
                    ×
                  </button>
                </div>

                <label className="spacetime-field">
                  <span>Object type</span>
                  <select
                    value={mass.cosmicType ?? "custom"}
                    onChange={(event) => {
                      const nextType = event.target.value as CosmicObjectType;
                      updateCosmicType(mass.id, nextType);
                      if (nextType !== "custom") {
                        updateMassValue(mass.id, COSMIC_MASS_PRESETS[nextType]);
                      }
                    }}
                  >
                    {COSMIC_TYPE_OPTIONS.map((option) => (
                      <option value={option.value} key={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                {mass.cosmicType === "custom" && (
                  <label className="spacetime-field spacetime-range-field">
                    <span>
                      Mass
                      <b>{formatMass(mass.mass)} solar masses</b>
                    </span>
                    <input
                      type="range"
                      min={MASS_MIN_VALUE}
                      max={MASS_MAX_VALUE}
                      step={MASS_STEP}
                      value={mass.mass}
                      onChange={(event) =>
                        updateMassValue(mass.id, Number(event.target.value))
                      }
                    />
                  </label>
                )}
              </section>
            );
          })}
        </div>

        <footer className="spacetime-controls-actions">
          <button type="button" className="is-primary" onClick={handleAddMass}>
            <span aria-hidden="true">＋</span>
            Add object
          </button>
          <button type="button" onClick={reset}>
            <span aria-hidden="true">↺</span>
            Reset
          </button>
        </footer>
      </aside>
    </>
  );
}
