"use client";

import { useState } from "react";
import {
  EXTERNAL_SHEAR_MAX,
  EXTERNAL_SHEAR_MIN,
  EXTERNAL_SHEAR_STEP,
  HALO_FRACTION_MAX,
  HALO_FRACTION_MIN,
  HALO_FRACTION_STEP,
  LENS_MASS_MAX,
  LENS_MASS_MIN,
  LENS_MASS_STEP,
  SOURCE_POSITION_LIMIT,
  SOURCE_SIZE_MAX,
  SOURCE_SIZE_MIN,
  SOURCE_SIZE_STEP,
  STELLAR_ELLIPTICITY_MAX,
  STELLAR_ELLIPTICITY_MIN,
  STELLAR_ELLIPTICITY_STEP,
} from "@/constants";
import {
  useExternalShear,
  useHaloFraction,
  useLensMass,
  useLensSourceSize,
  useLensSourceX,
  useLensSourceY,
  useResetLensing,
  useSetExternalShear,
  useSetHaloFraction,
  useSetLensMass,
  useSetLensSourcePosition,
  useSetLensSourceSize,
  useSetShowLensGalaxy,
  useSetShowLensGuides,
  useSetShowSubstructure,
  useSetStellarEllipticity,
  useShowLensGalaxy,
  useShowLensGuides,
  useShowSubstructure,
  useStellarEllipticity,
} from "@/store/lensing-store";
import {
  getEinsteinAngle,
  getEinsteinRadius,
} from "@/utils/lensing-calculations";

const ALIGNMENT_PRESETS = [
  { label: "Ring", x: 0, y: 0 },
  { label: "Quad", x: 0.12, y: 0.05 },
  { label: "Fold arc", x: 0.34, y: 0.08 },
] as const;

function formatSigned(value: number) {
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)} θE`;
}

function isPresetActive(
  sourceX: number,
  sourceY: number,
  preset: (typeof ALIGNMENT_PRESETS)[number],
) {
  return (
    Math.abs(sourceX - preset.x) < 0.006 && Math.abs(sourceY - preset.y) < 0.006
  );
}

export function LensingControls() {
  const lensMass = useLensMass();
  const sourceX = useLensSourceX();
  const sourceY = useLensSourceY();
  const sourceSize = useLensSourceSize();
  const stellarEllipticity = useStellarEllipticity();
  const haloFraction = useHaloFraction();
  const externalShear = useExternalShear();
  const showSubstructure = useShowSubstructure();
  const showLensGalaxy = useShowLensGalaxy();
  const showGuides = useShowLensGuides();

  const setLensMass = useSetLensMass();
  const setSourcePosition = useSetLensSourcePosition();
  const setSourceSize = useSetLensSourceSize();
  const setStellarEllipticity = useSetStellarEllipticity();
  const setHaloFraction = useSetHaloFraction();
  const setExternalShear = useSetExternalShear();
  const setShowSubstructure = useSetShowSubstructure();
  const setShowLensGalaxy = useSetShowLensGalaxy();
  const setShowGuides = useSetShowLensGuides();
  const reset = useResetLensing();
  const [panelOpen, setPanelOpen] = useState(false);

  const einsteinRadius = getEinsteinRadius(lensMass);
  const einsteinAngle = getEinsteinAngle(lensMass);

  return (
    <>
      <button
        type="button"
        className="lensing-controls-toggle spacetime-objects-toggle"
        onClick={() => setPanelOpen((open) => !open)}
        aria-expanded={panelOpen}
        aria-controls="lensing-observatory-controls"
      >
        <span>Lens setup</span>
        <b aria-hidden="true">◎</b>
      </button>

      <aside
        id="lensing-observatory-controls"
        className={
          panelOpen
            ? "is-open lensing-controls spacetime-controls"
            : "lensing-controls spacetime-controls"
        }
        aria-label="Gravitational lensing parameters"
      >
        <header className="spacetime-controls-header">
          <div>
            <span className="spacetime-panel-kicker">
              Change the conditions
            </span>
            <h2>Lens setup</h2>
          </div>
          <button
            type="button"
            className="spacetime-panel-close"
            onClick={() => setPanelOpen(false)}
            aria-label="Close lens parameters"
          >
            ×
          </button>
        </header>

        <div className="spacetime-controls-summary">
          <span>
            <b>{lensMass.toFixed(1)}T</b>
            solar masses
          </span>
          <span>
            <b>{einsteinAngle.toFixed(2)}″</b>
            reference scale
          </span>
        </div>

        <div className="lensing-control-list black-hole-control-list">
          <section className="black-hole-control-section">
            <div className="black-hole-control-heading">
              <span aria-hidden="true">01</span>
              <div>
                <h3>Source alignment</h3>
                <p>Move the distant galaxy through the lens caustics.</p>
              </div>
            </div>

            <fieldset className="lensing-preset-grid">
              <legend className="sr-only">Alignment presets</legend>
              {ALIGNMENT_PRESETS.map((preset) => (
                <button
                  type="button"
                  key={preset.label}
                  className={
                    isPresetActive(sourceX, sourceY, preset)
                      ? "is-active"
                      : undefined
                  }
                  aria-pressed={isPresetActive(sourceX, sourceY, preset)}
                  onClick={() => setSourcePosition(preset.x, preset.y)}
                >
                  {preset.label}
                </button>
              ))}
            </fieldset>

            <label className="black-hole-range-field">
              <span>
                Horizontal offset
                <b>{formatSigned(sourceX)}</b>
              </span>
              <input
                type="range"
                min={-SOURCE_POSITION_LIMIT}
                max={SOURCE_POSITION_LIMIT}
                step={0.01}
                value={sourceX}
                onChange={(event) =>
                  setSourcePosition(Number(event.target.value), sourceY)
                }
              />
            </label>

            <label className="black-hole-range-field">
              <span>
                Vertical offset
                <b>{formatSigned(sourceY)}</b>
              </span>
              <input
                type="range"
                min={-SOURCE_POSITION_LIMIT}
                max={SOURCE_POSITION_LIMIT}
                step={0.01}
                value={sourceY}
                onChange={(event) =>
                  setSourcePosition(sourceX, Number(event.target.value))
                }
              />
            </label>
          </section>

          <section className="black-hole-control-section">
            <div className="black-hole-control-heading">
              <span aria-hidden="true">02</span>
              <div>
                <h3>Lens and source</h3>
                <p>Set the total bending scale and source extent.</p>
              </div>
            </div>

            <label className="black-hole-range-field">
              <span>
                Lens mass
                <b>{lensMass.toFixed(1)} trillion M☉</b>
              </span>
              <input
                type="range"
                min={LENS_MASS_MIN}
                max={LENS_MASS_MAX}
                step={LENS_MASS_STEP}
                value={lensMass}
                onChange={(event) => setLensMass(Number(event.target.value))}
              />
              <small>
                Sets the reference Einstein scale for the combined mass.
              </small>
            </label>

            <label className="black-hole-range-field">
              <span>
                Source size
                <b>
                  {Math.round(
                    (sourceSize / einsteinRadius) * einsteinAngle * 1000,
                  )}{" "}
                  mas
                </b>
              </span>
              <input
                type="range"
                min={SOURCE_SIZE_MIN}
                max={SOURCE_SIZE_MAX}
                step={SOURCE_SIZE_STEP}
                value={sourceSize}
                onChange={(event) => setSourceSize(Number(event.target.value))}
              />
            </label>
          </section>

          <section className="black-hole-control-section">
            <div className="black-hole-control-heading">
              <span aria-hidden="true">03</span>
              <div>
                <h3>Mass distribution</h3>
                <p>Separate starlight from the larger dark-matter potential.</p>
              </div>
            </div>

            <label className="black-hole-range-field">
              <span>
                Stellar ellipticity
                <b>{stellarEllipticity.toFixed(2)}</b>
              </span>
              <input
                type="range"
                min={STELLAR_ELLIPTICITY_MIN}
                max={STELLAR_ELLIPTICITY_MAX}
                step={STELLAR_ELLIPTICITY_STEP}
                value={stellarEllipticity}
                onChange={(event) =>
                  setStellarEllipticity(Number(event.target.value))
                }
              />
              <small>
                Flattens the visible galaxy and its stellar potential.
              </small>
            </label>

            <label className="black-hole-range-field">
              <span>
                Dark-matter share
                <b>{Math.round(haloFraction * 100)}%</b>
              </span>
              <input
                type="range"
                min={HALO_FRACTION_MIN}
                max={HALO_FRACTION_MAX}
                step={HALO_FRACTION_STEP}
                value={haloFraction}
                onChange={(event) =>
                  setHaloFraction(Number(event.target.value))
                }
              />
              <small>
                Blends the compact stellar lens with an extended NFW-like halo.
              </small>
            </label>

            <label className="black-hole-range-field">
              <span>
                External shear
                <b>{externalShear.toFixed(3)}</b>
              </span>
              <input
                type="range"
                min={EXTERNAL_SHEAR_MIN}
                max={EXTERNAL_SHEAR_MAX}
                step={EXTERNAL_SHEAR_STEP}
                value={externalShear}
                onChange={(event) =>
                  setExternalShear(Number(event.target.value))
                }
              />
              <small>Tidal gravity from nearby galaxies and structure.</small>
            </label>
          </section>

          <section className="black-hole-control-section">
            <div className="black-hole-control-heading">
              <span aria-hidden="true">04</span>
              <div>
                <h3>Structure and guides</h3>
                <p>Reveal what shapes the ray-traced image.</p>
              </div>
            </div>

            <label className="black-hole-switch-row">
              <span>
                <b>Satellite subhalo</b>
                <small>A small dark clump that locally perturbs the arcs</small>
              </span>
              <input
                type="checkbox"
                checked={showSubstructure}
                onChange={(event) => setShowSubstructure(event.target.checked)}
              />
              <i aria-hidden="true" />
            </label>

            <label className="black-hole-switch-row">
              <span>
                <b>Show foreground lens</b>
                <small>The luminous galaxy inside the full mass model</small>
              </span>
              <input
                type="checkbox"
                checked={showLensGalaxy}
                onChange={(event) => setShowLensGalaxy(event.target.checked)}
              />
              <i aria-hidden="true" />
            </label>

            <label className="black-hole-switch-row">
              <span>
                <b>Show ray-tracing guides</b>
                <small>
                  Critical curve, mass contours, and source position
                </small>
              </span>
              <input
                type="checkbox"
                checked={showGuides}
                onChange={(event) => setShowGuides(event.target.checked)}
              />
              <i aria-hidden="true" />
            </label>
          </section>
        </div>

        <footer className="lensing-controls-actions spacetime-controls-actions">
          <button type="button" onClick={reset}>
            <span aria-hidden="true">↺</span>
            Reset experiment
          </button>
        </footer>
      </aside>
    </>
  );
}
