"use client";

import { useState } from "react";
import {
  BH_MASS_MAX,
  BH_MASS_MIN,
  BH_MASS_STEP,
  DISK_SPEED_MAX,
  LENS_STRENGTH_MAX,
  LENS_STRENGTH_MIN,
  SCHWARZSCHILD_KM_PER_SOLAR_MASS,
} from "@/constants";
import {
  useBlackHoleMass,
  useBlackHoleQuality,
  useDiskSpeed,
  useLensingStrength,
  useResetBlackHole,
  useSetBlackHoleMass,
  useSetBlackHoleQuality,
  useSetDiskSpeed,
  useSetLensingStrength,
  useSetShowDisk,
  useSetShowPhotonSphere,
  useShowDisk,
  useShowPhotonSphere,
} from "@/store/black-hole-store";
import type { BlackHoleQuality } from "@/types";

function formatMultiplier(value: number) {
  return `${value.toFixed(2)}×`;
}

export function BlackHoleControls() {
  const mass = useBlackHoleMass();
  const lensingStrength = useLensingStrength();
  const showPhotonSphere = useShowPhotonSphere();
  const showDisk = useShowDisk();
  const diskSpeed = useDiskSpeed();
  const quality = useBlackHoleQuality();

  const setMass = useSetBlackHoleMass();
  const setShowDisk = useSetShowDisk();
  const setDiskSpeed = useSetDiskSpeed();
  const setShowPhotonSphere = useSetShowPhotonSphere();
  const setLensingStrength = useSetLensingStrength();
  const setQuality = useSetBlackHoleQuality();
  const reset = useResetBlackHole();
  const [panelOpen, setPanelOpen] = useState(false);

  const radiusKm = mass * SCHWARZSCHILD_KM_PER_SOLAR_MASS;

  return (
    <>
      <button
        type="button"
        className="black-hole-controls-toggle spacetime-objects-toggle"
        onClick={() => setPanelOpen((open) => !open)}
        aria-expanded={panelOpen}
        aria-controls="black-hole-observatory-controls"
      >
        <span>Parameters</span>
        <b aria-hidden="true">◎</b>
      </button>

      <aside
        id="black-hole-observatory-controls"
        className={
          panelOpen
            ? "black-hole-controls is-open spacetime-controls"
            : "black-hole-controls spacetime-controls"
        }
        aria-label="Black hole parameters"
      >
        <header className="spacetime-controls-header">
          <div>
            <span className="spacetime-panel-kicker">
              Change the conditions
            </span>
            <h2>Observatory</h2>
          </div>
          <button
            type="button"
            className="spacetime-panel-close"
            onClick={() => setPanelOpen(false)}
            aria-label="Close black hole parameters"
          >
            ×
          </button>
        </header>

        <div className="spacetime-controls-summary">
          <span>
            <b>{mass}</b>
            solar masses
          </span>
          <span>
            <b>{radiusKm.toFixed(1)} km</b>
            horizon radius
          </span>
        </div>

        <div className="black-hole-control-list">
          <section className="black-hole-control-section">
            <div className="black-hole-control-heading">
              <span aria-hidden="true">01</span>
              <div>
                <h3>Gravity</h3>
                <p>Change the mass and how strongly light bends.</p>
              </div>
            </div>

            <label className="black-hole-range-field">
              <span>
                Black hole mass
                <b>{mass} solar masses</b>
              </span>
              <input
                type="range"
                min={BH_MASS_MIN}
                max={BH_MASS_MAX}
                step={BH_MASS_STEP}
                value={mass}
                onChange={(event) => setMass(Number(event.target.value))}
              />
              <small>
                Schwarzschild radius: {radiusKm.toFixed(1)} kilometers. The
                observer and distant galaxy stay fixed as the shadow grows.
              </small>
            </label>

            <label className="black-hole-range-field">
              <span>
                Lensing model
                <b>{formatMultiplier(lensingStrength)}</b>
              </span>
              <input
                type="range"
                min={LENS_STRENGTH_MIN}
                max={LENS_STRENGTH_MAX}
                step={0.05}
                value={lensingStrength}
                onChange={(event) =>
                  setLensingStrength(Number(event.target.value))
                }
              />
              <small>
                1.00× follows Schwarzschild gravity; other values are an
                educational exaggeration.
              </small>
            </label>
          </section>

          <section className="black-hole-control-section">
            <div className="black-hole-control-heading">
              <span aria-hidden="true">02</span>
              <div>
                <h3>Accretion disk</h3>
                <p>Reveal the hot material orbiting outside the horizon.</p>
              </div>
            </div>

            <label className="black-hole-switch-row">
              <span>
                <b>Show accretion disk</b>
                <small>Hot gas spiraling around the black hole</small>
              </span>
              <input
                type="checkbox"
                checked={showDisk}
                onChange={(event) => setShowDisk(event.target.checked)}
              />
              <i aria-hidden="true" />
            </label>

            <label
              className={
                showDisk
                  ? "black-hole-range-field"
                  : "black-hole-range-field is-disabled"
              }
            >
              <span>
                Disk flow speed
                <b>{formatMultiplier(diskSpeed)}</b>
              </span>
              <input
                type="range"
                min={0}
                max={DISK_SPEED_MAX}
                step={0.1}
                value={diskSpeed}
                disabled={!showDisk}
                onChange={(event) => setDiskSpeed(Number(event.target.value))}
              />
              <small>
                Moves turbulent bright knots around the disk; slowed for
                observation.
              </small>
            </label>
          </section>

          <section className="black-hole-control-section">
            <div className="black-hole-control-heading">
              <span aria-hidden="true">03</span>
              <div>
                <h3>Reference and quality</h3>
                <p>Outline the shadow or tune rendering detail.</p>
              </div>
            </div>

            <label className="black-hole-switch-row">
              <span>
                <b>Photon ring guide</b>
                <small>
                  {showDisk
                    ? "Outlines the critical light curve at the shadow edge"
                    : "Shown automatically to anchor the disk-off view"}
                </small>
              </span>
              <input
                type="checkbox"
                checked={showPhotonSphere || !showDisk}
                disabled={!showDisk}
                onChange={(event) => setShowPhotonSphere(event.target.checked)}
              />
              <i aria-hidden="true" />
            </label>

            <label className="black-hole-select-field">
              <span>Ray-tracing quality</span>
              <select
                value={quality}
                onChange={(event) =>
                  setQuality(event.target.value as BlackHoleQuality)
                }
              >
                <option value="auto">Balanced</option>
                <option value="low">Efficient</option>
                <option value="high">High detail</option>
              </select>
            </label>
          </section>
        </div>

        <footer className="black-hole-controls-actions spacetime-controls-actions">
          <button type="button" onClick={reset}>
            <span aria-hidden="true">↺</span>
            Reset parameters
          </button>
        </footer>
      </aside>
    </>
  );
}
