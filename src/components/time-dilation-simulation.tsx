"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  circularOrbitClockRate,
  schwarzschildRadiusKm,
  staticClockRate,
} from "@/utils/relativity-calculations";

type ObserverMode = "static" | "orbit";
type DistanceLock = "normalized" | "physical";

const INITIAL_MASS = 4_000_000;
const INITIAL_NEAR_RADIUS = 2.2;
const INITIAL_FAR_RADIUS = 20;
const MASS_PRESETS = [
  { mass: 10, label: "10 M☉ · stellar black hole" },
  { mass: 1000, label: "1,000 M☉ · intermediate" },
  { mass: 4_000_000, label: "4 million M☉ · Sagittarius A*" },
  { mass: 8_000_000, label: "8 million M☉ · massive galactic core" },
  { mass: 6_500_000_000, label: "6.5 billion M☉ · M87*" },
] as const;

function formatDistance(distanceKm: number) {
  const astronomicalUnitKm = 149_597_870.7;
  if (distanceKm >= astronomicalUnitKm * 0.1) {
    return `${(distanceKm / astronomicalUnitKm).toFixed(2)} AU`;
  }
  if (distanceKm >= 1_000_000) {
    return `${(distanceKm / 1_000_000).toFixed(2)} million km`;
  }
  return `${distanceKm.toLocaleString(undefined, { maximumFractionDigits: 0 })} km`;
}

function drawClock(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  phase: number,
  color: string,
  label: string,
  rate: number,
  labelAbove = false,
) {
  context.save();
  context.shadowBlur = 28;
  context.shadowColor = color;
  context.fillStyle = "rgba(4, 9, 18, 0.92)";
  context.strokeStyle = color;
  context.lineWidth = 1.5;
  context.beginPath();
  context.arc(x, y, radius, 0, Math.PI * 2);
  context.fill();
  context.stroke();
  context.shadowBlur = 0;

  for (let tick = 0; tick < 12; tick += 1) {
    const angle = (tick / 12) * Math.PI * 2 - Math.PI / 2;
    const inner = radius * (tick % 3 === 0 ? 0.73 : 0.8);
    context.strokeStyle = "rgba(224, 239, 255, 0.55)";
    context.lineWidth = tick % 3 === 0 ? 1.5 : 1;
    context.beginPath();
    context.moveTo(x + Math.cos(angle) * inner, y + Math.sin(angle) * inner);
    context.lineTo(
      x + Math.cos(angle) * radius * 0.89,
      y + Math.sin(angle) * radius * 0.89,
    );
    context.stroke();
  }

  const minuteAngle = phase * Math.PI * 2 - Math.PI / 2;
  const hourAngle = phase * (Math.PI / 6) - Math.PI / 2;
  context.lineCap = "round";
  context.strokeStyle = "#f6fbff";
  context.lineWidth = 2;
  context.beginPath();
  context.moveTo(x, y);
  context.lineTo(
    x + Math.cos(minuteAngle) * radius * 0.66,
    y + Math.sin(minuteAngle) * radius * 0.66,
  );
  context.stroke();
  context.strokeStyle = color;
  context.lineWidth = 3;
  context.beginPath();
  context.moveTo(x, y);
  context.lineTo(
    x + Math.cos(hourAngle) * radius * 0.43,
    y + Math.sin(hourAngle) * radius * 0.43,
  );
  context.stroke();
  context.fillStyle = "#ffffff";
  context.beginPath();
  context.arc(x, y, 3, 0, Math.PI * 2);
  context.fill();

  context.textAlign = "center";
  context.fillStyle = "rgba(235, 245, 255, 0.92)";
  context.font = "600 11px system-ui, sans-serif";
  const labelY = labelAbove ? y - radius - 25 : y + radius + 20;
  context.fillText(label, x, labelY);
  context.fillStyle = color;
  context.font = "500 10px ui-monospace, monospace";
  context.fillText(`${rate.toFixed(5)} × t∞`, x, labelY + 16);
  context.restore();
}

function TimeDilationField({
  nearRadius,
  farRadius,
  nearRate,
  farRate,
  mode,
}: {
  nearRadius: number;
  farRadius: number;
  nearRate: number;
  farRate: number;
  mode: ObserverMode;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    let frame = 0;
    let width = 0;
    let height = 0;
    let start = performance.now();

    const resize = () => {
      const bounds = canvas.getBoundingClientRect();
      const pixelRatio = Math.min(window.devicePixelRatio, 2);
      width = bounds.width;
      height = bounds.height;
      canvas.width = Math.max(1, Math.round(width * pixelRatio));
      canvas.height = Math.max(1, Math.round(height * pixelRatio));
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    };

    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    resize();

    const render = (now: number) => {
      const elapsed = reduceMotion ? 0 : (now - start) / 1000;
      context.clearRect(0, 0, width, height);
      const centerX = width * (width < 768 ? 0.5 : 0.51);
      const centerY = height * 0.52;
      const maxRadius = Math.min(width, height) * (width < 768 ? 0.39 : 0.37);
      const horizon = Math.max(38, maxRadius * 0.16);

      const background = context.createRadialGradient(
        centerX,
        centerY,
        0,
        centerX,
        centerY,
        Math.max(width, height) * 0.72,
      );
      background.addColorStop(0, "#071324");
      background.addColorStop(0.35, "#030912");
      background.addColorStop(1, "#010306");
      context.fillStyle = background;
      context.fillRect(0, 0, width, height);

      context.fillStyle = "rgba(178, 219, 255, 0.58)";
      for (let index = 0; index < 170; index += 1) {
        const sx = ((index * 811) % 997) / 997;
        const sy = ((index * 613) % 991) / 991;
        const twinkle = 0.25 + 0.4 * Math.sin(index * 2.7 + elapsed * 0.4);
        context.globalAlpha = 0.24 + Math.max(0, twinkle);
        context.fillRect(
          sx * width,
          sy * height,
          index % 13 === 0 ? 1.5 : 0.7,
          0.7,
        );
      }
      context.globalAlpha = 1;

      const scaleLimit = Math.max(farRadius, 1.1);
      const radialScale = (radius: number) => {
        const normalizedRadius = Math.max(
          0,
          Math.min(1, (radius - 1) / (scaleLimit - 1)),
        );
        return horizon + Math.sqrt(normalizedRadius) * (maxRadius - horizon);
      };

      const rings = [1, 1.5, 3, 5, 10, farRadius];
      for (const radius of rings) {
        if (radius > farRadius * 1.001) continue;
        const visualRadius = radialScale(radius);
        context.setLineDash(radius === 1.5 || radius === 3 ? [5, 7] : []);
        context.strokeStyle =
          radius === 1.5
            ? "rgba(244, 181, 104, 0.34)"
            : radius === 3
              ? "rgba(120, 211, 255, 0.32)"
              : "rgba(137, 187, 224, 0.12)";
        context.lineWidth = radius === 1 ? 1.5 : 1;
        context.beginPath();
        context.arc(centerX, centerY, visualRadius, 0, Math.PI * 2);
        context.stroke();
      }
      context.setLineDash([]);

      const glow = context.createRadialGradient(
        centerX,
        centerY,
        horizon * 0.45,
        centerX,
        centerY,
        horizon * 1.55,
      );
      glow.addColorStop(0, "#000000");
      glow.addColorStop(0.62, "#000000");
      glow.addColorStop(0.75, "rgba(65, 152, 222, 0.18)");
      glow.addColorStop(1, "rgba(28, 88, 138, 0)");
      context.fillStyle = glow;
      context.beginPath();
      context.arc(centerX, centerY, horizon * 1.6, 0, Math.PI * 2);
      context.fill();
      context.fillStyle = "#000";
      context.beginPath();
      context.arc(centerX, centerY, horizon, 0, Math.PI * 2);
      context.fill();

      const nearAngle =
        mode === "orbit" ? elapsed * 0.23 - 0.7 : -Math.PI * 0.24;
      const farAngle = Math.PI * 0.76;
      const nearDistance = radialScale(nearRadius);
      const farDistance = radialScale(farRadius);
      const nearX = centerX + Math.cos(nearAngle) * nearDistance;
      const nearY = centerY + Math.sin(nearAngle) * nearDistance;
      const farX = centerX + Math.cos(farAngle) * farDistance;
      const farY = centerY + Math.sin(farAngle) * farDistance;

      context.strokeStyle = "rgba(116, 213, 255, 0.2)";
      context.beginPath();
      context.moveTo(centerX, centerY);
      context.lineTo(nearX, nearY);
      context.moveTo(centerX, centerY);
      context.lineTo(farX, farY);
      context.stroke();

      const clockRadius = width < 520 ? 27 : 34;
      drawClock(
        context,
        nearX,
        nearY,
        clockRadius,
        elapsed * nearRate * 0.16,
        "#77d8ff",
        mode === "orbit" ? "ORBITING CLOCK" : "NEAR CLOCK",
        nearRate,
        width < 768 || nearRadius < 3,
      );
      drawClock(
        context,
        farX,
        farY,
        clockRadius,
        elapsed * farRate * 0.16,
        "#d8ecff",
        "REFERENCE CLOCK",
        farRate,
      );

      context.fillStyle = "rgba(188, 216, 238, 0.55)";
      context.font = "500 10px ui-monospace, monospace";
      context.textAlign = "center";
      context.fillText("EVENT HORIZON · rₛ", centerX, centerY + 4);

      if (!reduceMotion) frame = requestAnimationFrame(render);
    };

    render(start);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      start = 0;
    };
  }, [farRadius, farRate, mode, nearRadius, nearRate]);

  return <canvas ref={canvasRef} />;
}

export function TimeDilationSimulation() {
  const initialHorizonKm = schwarzschildRadiusKm(INITIAL_MASS);
  const [mass, setMass] = useState(INITIAL_MASS);
  const [nearRadius, setNearRadius] = useState(INITIAL_NEAR_RADIUS);
  const [farRadius, setFarRadius] = useState(INITIAL_FAR_RADIUS);
  const [nearDistanceKm, setNearDistanceKm] = useState(
    INITIAL_NEAR_RADIUS * initialHorizonKm,
  );
  const [farDistanceKm, setFarDistanceKm] = useState(
    INITIAL_FAR_RADIUS * initialHorizonKm,
  );
  const [distanceLock, setDistanceLock] = useState<DistanceLock>("normalized");
  const [mode, setMode] = useState<ObserverMode>("static");
  const [panelOpen, setPanelOpen] = useState(false);
  const [hudOpen, setHudOpen] = useState(false);

  const horizonKm = schwarzschildRadiusKm(mass);
  const minimumRadius = mode === "orbit" ? 3 : 1.05;
  const effectiveNearRadius =
    distanceLock === "physical" ? nearDistanceKm / horizonKm : nearRadius;
  const effectiveFarRadius =
    distanceLock === "physical" ? farDistanceKm / horizonKm : farRadius;
  const safeNearRadius = Math.max(effectiveNearRadius, minimumRadius);
  const nearRate =
    mode === "orbit"
      ? circularOrbitClockRate(safeNearRadius)
      : staticClockRate(safeNearRadius);
  const farRate = staticClockRate(effectiveFarRadius);
  const relativeRate = nearRate / farRate;
  const lagPerDay = 86_400 * (1 - relativeRate);
  const massLabel = useMemo(
    () =>
      mass >= 1_000_000
        ? `${(mass / 1_000_000).toFixed(1)} million`
        : mass.toLocaleString(),
    [mass],
  );
  const nearPhysicalMinimumKm = minimumRadius * horizonKm;
  const nearPhysicalMaximumKm = Math.max(
    nearPhysicalMinimumKm * 1.1,
    farDistanceKm / 1.1,
  );
  const farPhysicalMinimumKm = Math.max(nearDistanceKm * 1.1, 1.05 * horizonKm);
  const farPhysicalMaximumKm = Math.max(
    farPhysicalMinimumKm * 1.1,
    farDistanceKm * 10,
  );
  const normalizedNearMaximum = Math.max(
    15,
    effectiveFarRadius * 0.9,
    safeNearRadius,
  );
  const normalizedFarMinimum =
    Math.ceil(Math.max(1.1, safeNearRadius * 1.1) * 10) / 10;
  const normalizedFarMaximum = Math.max(80, effectiveFarRadius);

  function changeMode(nextMode: ObserverMode) {
    setMode(nextMode);
    if (nextMode !== "orbit" || effectiveNearRadius >= 3) return;
    if (distanceLock === "physical") {
      setNearDistanceKm(6 * horizonKm);
      setFarDistanceKm((current) => Math.max(current, 20 * horizonKm));
    } else {
      setNearRadius(6);
    }
  }

  function changeDistanceLock(nextLock: DistanceLock) {
    if (nextLock === distanceLock) return;
    if (nextLock === "physical") {
      setNearDistanceKm(safeNearRadius * horizonKm);
      setFarDistanceKm(effectiveFarRadius * horizonKm);
    } else {
      setNearRadius(safeNearRadius);
      setFarRadius(effectiveFarRadius);
    }
    setDistanceLock(nextLock);
  }

  function massKeepsClockOutside(massSolar: number) {
    if (distanceLock === "normalized") return true;
    return nearDistanceKm / schwarzschildRadiusKm(massSolar) >= minimumRadius;
  }

  function reset() {
    setMass(INITIAL_MASS);
    setNearRadius(INITIAL_NEAR_RADIUS);
    setFarRadius(INITIAL_FAR_RADIUS);
    setNearDistanceKm(INITIAL_NEAR_RADIUS * initialHorizonKm);
    setFarDistanceKm(INITIAL_FAR_RADIUS * initialHorizonKm);
    setDistanceLock("normalized");
    setMode("static");
  }

  return (
    <main className="physics-shell time-dilation-shell">
      <nav className="spacetime-topbar" aria-label="Simulation navigation">
        <Link href="/" className="spacetime-back">
          <span aria-hidden="true">←</span>
          <span>Mission select</span>
        </Link>
        <div className="spacetime-mission-id">
          <span>04</span>
          <b>Time</b>
        </div>
      </nav>

      <button
        type="button"
        className="physics-controls-toggle spacetime-objects-toggle"
        onClick={() => setPanelOpen((open) => !open)}
        aria-expanded={panelOpen}
        aria-controls="time-dilation-controls"
      >
        <span>Clock setup</span>
        <b aria-hidden="true">τ</b>
      </button>

      <aside
        id="time-dilation-controls"
        className={
          panelOpen
            ? "physics-controls is-open spacetime-controls"
            : "physics-controls spacetime-controls"
        }
        aria-label="Time dilation parameters"
      >
        <header className="spacetime-controls-header">
          <div>
            <span className="spacetime-panel-kicker">
              Change the conditions
            </span>
            <h2>Clock setup</h2>
          </div>
          <button
            type="button"
            className="spacetime-panel-close"
            onClick={() => setPanelOpen(false)}
            aria-label="Close clock parameters"
          >
            ×
          </button>
        </header>

        <div className="spacetime-controls-summary">
          <span>
            <b>{nearRate.toFixed(5)}</b>
            near dτ/dt∞
          </span>
          <span>
            <b>{lagPerDay.toFixed(lagPerDay < 10 ? 2 : 0)} s</b>
            lag per far day
          </span>
        </div>

        <div className="black-hole-control-list">
          <section className="black-hole-control-section">
            <div className="black-hole-control-heading">
              <span aria-hidden="true">01</span>
              <div>
                <h3>Observer</h3>
                <p>
                  Compare a supported clock with one in free circular orbit.
                </p>
              </div>
            </div>
            <fieldset className="physics-segmented">
              <legend className="sr-only">Observer motion</legend>
              <button
                type="button"
                className={mode === "static" ? "is-active" : undefined}
                onClick={() => changeMode("static")}
              >
                Static
              </button>
              <button
                type="button"
                className={mode === "orbit" ? "is-active" : undefined}
                onClick={() => changeMode("orbit")}
              >
                Free orbit
              </button>
            </fieldset>
            <p className="physics-equation">
              {mode === "static"
                ? "dτ/dt∞ = √(1 − rₛ/r)"
                : "dτ/dt∞ = √(1 − 3rₛ/2r)"}
            </p>
          </section>

          <section className="black-hole-control-section">
            <div className="black-hole-control-heading">
              <span aria-hidden="true">02</span>
              <div>
                <h3>Clock positions</h3>
                <p>Choose what remains unchanged when mass changes.</p>
              </div>
            </div>
            <fieldset className="physics-segmented">
              <legend className="sr-only">Distance held fixed</legend>
              <button
                type="button"
                className={
                  distanceLock === "normalized" ? "is-active" : undefined
                }
                onClick={() => changeDistanceLock("normalized")}
              >
                Hold r / rₛ
              </button>
              <button
                type="button"
                className={
                  distanceLock === "physical" ? "is-active" : undefined
                }
                onClick={() => changeDistanceLock("physical")}
              >
                Hold kilometres
              </button>
            </fieldset>
            <p className="physics-note">
              {distanceLock === "normalized"
                ? "Mass rescales the entire system; clock rates stay unchanged."
                : "Physical distances stay fixed; mass now changes position and proper time."}
            </p>

            {distanceLock === "normalized" ? (
              <>
                <label className="black-hole-range-field">
                  <span>
                    Near clock radius
                    <b>{safeNearRadius.toFixed(2)} rₛ</b>
                  </span>
                  <input
                    type="range"
                    min={minimumRadius}
                    max={normalizedNearMaximum}
                    step={0.05}
                    value={safeNearRadius}
                    onChange={(event) =>
                      setNearRadius(Number(event.target.value))
                    }
                  />
                  <small>
                    {mode === "orbit"
                      ? "Stable circular geodesics begin at the ISCO: 3 rₛ."
                      : "A static observer needs unbounded acceleration at rₛ."}
                  </small>
                </label>
                <label className="black-hole-range-field">
                  <span>
                    Reference radius
                    <b>{effectiveFarRadius.toFixed(0)} rₛ</b>
                  </span>
                  <input
                    type="range"
                    min={normalizedFarMinimum}
                    max={normalizedFarMaximum}
                    step={0.1}
                    value={effectiveFarRadius}
                    onChange={(event) =>
                      setFarRadius(Number(event.target.value))
                    }
                  />
                </label>
              </>
            ) : (
              <>
                <label className="black-hole-range-field">
                  <span>
                    Near clock distance
                    <b>{formatDistance(nearDistanceKm)}</b>
                  </span>
                  <input
                    type="range"
                    min={Math.log10(nearPhysicalMinimumKm)}
                    max={Math.log10(nearPhysicalMaximumKm)}
                    step="any"
                    value={Math.log10(nearDistanceKm)}
                    onChange={(event) =>
                      setNearDistanceKm(10 ** Number(event.target.value))
                    }
                  />
                  <small>
                    {safeNearRadius.toFixed(3)} rₛ at the selected mass.
                  </small>
                </label>
                <label className="black-hole-range-field">
                  <span>
                    Reference distance
                    <b>{formatDistance(farDistanceKm)}</b>
                  </span>
                  <input
                    type="range"
                    min={Math.log10(farPhysicalMinimumKm)}
                    max={Math.log10(farPhysicalMaximumKm)}
                    step="any"
                    value={Math.log10(farDistanceKm)}
                    onChange={(event) =>
                      setFarDistanceKm(10 ** Number(event.target.value))
                    }
                  />
                  <small>
                    {effectiveFarRadius.toFixed(3)} rₛ at the selected mass.
                  </small>
                </label>
              </>
            )}
          </section>

          <section className="black-hole-control-section">
            <div className="black-hole-control-heading">
              <span aria-hidden="true">03</span>
              <div>
                <h3>Central mass</h3>
                <p>
                  {distanceLock === "physical"
                    ? "Change curvature while both clocks remain at fixed distances."
                    : "Change physical scale while the normalized geometry remains fixed."}
                </p>
              </div>
            </div>
            <label className="black-hole-select-field">
              <span>Mass preset</span>
              <select
                value={mass}
                onChange={(event) => setMass(Number(event.target.value))}
              >
                {MASS_PRESETS.map((preset) => (
                  <option
                    key={preset.mass}
                    value={preset.mass}
                    disabled={!massKeepsClockOutside(preset.mass)}
                  >
                    {preset.label}
                  </option>
                ))}
              </select>
            </label>
            <p className="physics-note">
              Horizon radius:{" "}
              {horizonKm.toLocaleString(undefined, {
                maximumFractionDigits: 0,
              })}{" "}
              km. Near clock: {safeNearRadius.toFixed(3)} rₛ.
              {distanceLock === "physical" &&
                " Presets inside the clock radius are disabled."}
            </p>
          </section>
        </div>

        <footer className="black-hole-controls-actions spacetime-controls-actions">
          <button type="button" onClick={reset}>
            <span aria-hidden="true">↺</span>
            Reset parameters
          </button>
        </footer>
      </aside>

      <button
        type="button"
        className="spacetime-info-toggle"
        onClick={() => setHudOpen((open) => !open)}
        aria-expanded={hudOpen}
        aria-controls="time-dilation-instructions"
        aria-label={hudOpen ? "Hide instructions" : "Show instructions"}
      >
        {hudOpen ? "×" : "?"}
      </button>

      <section
        id="time-dilation-instructions"
        className={
          hudOpen
            ? "is-open physics-brief spacetime-brief"
            : "physics-brief spacetime-brief"
        }
        aria-label="Simulation instructions"
      >
        <p className="spacetime-eyebrow">Schwarzschild clock laboratory</p>
        <h1>Time Dilation</h1>
        <p className="spacetime-brief-copy">
          The clocks share one distant coordinate time. Their hands advance by
          the proper time measured along each worldline.
        </p>
        <div className="spacetime-readout">
          <span>
            <b>{massLabel} M☉</b>
            central mass
          </span>
          <span>
            <b>{(relativeRate * 100).toFixed(2)}%</b>
            near vs reference
          </span>
        </div>
        <div className="spacetime-instructions">
          <div>
            <span className="spacetime-instruction-number">1</span>
            <p>
              <b>Move the near clock</b>Approach the horizon and watch it fall
              behind
            </p>
          </div>
          <div>
            <span className="spacetime-instruction-number">2</span>
            <p>
              <b>Switch worldlines</b>Separate gravitational and orbital effects
            </p>
          </div>
        </div>
      </section>

      <section
        className="physics-canvas"
        aria-label="Animated time dilation clocks"
      >
        <TimeDilationField
          nearRadius={safeNearRadius}
          farRadius={effectiveFarRadius}
          nearRate={nearRate}
          farRate={farRate}
          mode={mode}
        />
      </section>

      <div className="physics-formula-strip" aria-live="polite">
        <span>Near clock</span>
        <b>{nearRate.toFixed(6)} s per distant second</b>
      </div>
      <div className="spacetime-vignette" aria-hidden="true" />
      <div className="spacetime-grain" aria-hidden="true" />
    </main>
  );
}
