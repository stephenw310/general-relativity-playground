"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  CRITICAL_PHOTON_IMPACT,
  type GeodesicPoint,
  traceNullGeodesic,
  traceTimelikeGeodesic,
} from "@/utils/relativity-calculations";

type GeodesicMode = "light" | "massive";

function drawPath(
  context: CanvasRenderingContext2D,
  points: GeodesicPoint[],
  centerX: number,
  centerY: number,
  scale: number,
  color: string,
  lineWidth: number,
  alpha = 1,
) {
  if (points.length < 2) return;
  context.save();
  context.globalAlpha = alpha;
  context.strokeStyle = color;
  context.lineWidth = lineWidth;
  context.lineJoin = "round";
  context.beginPath();
  for (let index = 0; index < points.length; index += 1) {
    const point = points[index];
    const x = centerX + point.x * scale;
    const y = centerY - point.y * scale;
    if (index === 0) context.moveTo(x, y);
    else context.lineTo(x, y);
  }
  context.stroke();
  context.restore();
}

function newtonianOrbit(
  semiLatusRectum: number,
  eccentricity: number,
): GeodesicPoint[] {
  return Array.from({ length: 361 }, (_, index) => {
    const phi = (index / 360) * Math.PI * 2;
    const r = semiLatusRectum / (2 * (1 + eccentricity * Math.cos(phi)));
    return { x: r * Math.cos(phi), y: r * Math.sin(phi), r, phi };
  });
}

function GeodesicField({
  mode,
  primaryPath,
  bundlePaths,
  ghostPath,
  persistentTrails,
  viewRadius,
  energy,
  angularMomentum,
  impactParameter,
}: {
  mode: GeodesicMode;
  primaryPath: GeodesicPoint[];
  bundlePaths: GeodesicPoint[][];
  ghostPath: GeodesicPoint[];
  persistentTrails: GeodesicPoint[][];
  viewRadius: number;
  energy: number;
  angularMomentum: number;
  impactParameter: number;
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
    let width = 0;
    let height = 0;
    let frame = 0;

    const resize = () => {
      const bounds = canvas.getBoundingClientRect();
      const ratio = Math.min(window.devicePixelRatio, 2);
      width = bounds.width;
      height = bounds.height;
      canvas.width = Math.max(1, Math.round(width * ratio));
      canvas.height = Math.max(1, Math.round(height * ratio));
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
    };
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    resize();

    const render = (now: number) => {
      context.clearRect(0, 0, width, height);
      const centerX = width * (width < 768 ? 0.5 : 0.51);
      const centerY = height * 0.51;
      const available = Math.min(width * 0.88, height * 0.82) / 2;
      const scale = available / viewRadius;

      const background = context.createRadialGradient(
        centerX,
        centerY,
        0,
        centerX,
        centerY,
        Math.max(width, height) * 0.72,
      );
      background.addColorStop(0, "#071611");
      background.addColorStop(0.42, "#020a08");
      background.addColorStop(1, "#010403");
      context.fillStyle = background;
      context.fillRect(0, 0, width, height);

      context.fillStyle = "rgba(189, 255, 219, 0.5)";
      for (let index = 0; index < 150; index += 1) {
        const x = (((index * 757) % 991) / 991) * width;
        const y = (((index * 431) % 983) / 983) * height;
        context.globalAlpha = 0.16 + (index % 11) / 28;
        context.fillRect(x, y, index % 17 === 0 ? 1.4 : 0.65, 0.65);
      }
      context.globalAlpha = 1;

      context.strokeStyle = "rgba(117, 201, 156, 0.13)";
      context.lineWidth = 1;
      for (const radius of [1, 1.5, 3, 5, 10, 20]) {
        if (radius >= viewRadius) continue;
        context.setLineDash(radius === 1.5 || radius === 3 ? [5, 7] : []);
        context.beginPath();
        context.arc(centerX, centerY, radius * scale, 0, Math.PI * 2);
        context.stroke();
      }
      context.setLineDash([]);
      for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 8) {
        context.beginPath();
        context.moveTo(
          centerX + Math.cos(angle) * scale,
          centerY - Math.sin(angle) * scale,
        );
        context.lineTo(
          centerX + Math.cos(angle) * available,
          centerY - Math.sin(angle) * available,
        );
        context.stroke();
      }

      const photonRadius = 1.5 * scale;
      context.strokeStyle = "rgba(251, 190, 104, 0.48)";
      context.setLineDash([3, 5]);
      context.beginPath();
      context.arc(centerX, centerY, photonRadius, 0, Math.PI * 2);
      context.stroke();
      context.setLineDash([]);

      const horizonRadius = Math.max(4, scale);
      const horizonGlow = context.createRadialGradient(
        centerX,
        centerY,
        horizonRadius * 0.5,
        centerX,
        centerY,
        horizonRadius * 2.2,
      );
      horizonGlow.addColorStop(0, "#000");
      horizonGlow.addColorStop(0.46, "#000");
      horizonGlow.addColorStop(0.66, "rgba(83, 194, 139, 0.2)");
      horizonGlow.addColorStop(1, "rgba(20, 80, 55, 0)");
      context.fillStyle = horizonGlow;
      context.beginPath();
      context.arc(centerX, centerY, horizonRadius * 2.25, 0, Math.PI * 2);
      context.fill();
      context.fillStyle = "#000";
      context.beginPath();
      context.arc(centerX, centerY, horizonRadius, 0, Math.PI * 2);
      context.fill();

      for (const path of bundlePaths) {
        drawPath(context, path, centerX, centerY, scale, "#82ffc1", 0.75, 0.16);
      }

      for (const path of persistentTrails) {
        drawPath(context, path, centerX, centerY, scale, "#90eab8", 1, 0.25);
      }

      if (mode === "massive" && ghostPath.length) {
        context.save();
        context.setLineDash([6, 7]);
        drawPath(
          context,
          ghostPath,
          centerX,
          centerY,
          scale,
          "#aeb8b3",
          1.1,
          0.52,
        );
        context.restore();
        context.fillStyle = "rgba(201, 211, 206, 0.62)";
        context.font = "500 10px ui-monospace, monospace";
        context.textAlign = "left";
        context.fillText(
          "NEWTONIAN PREDICTION · CLOSED ELLIPSE",
          centerX - available * 0.72,
          centerY - available * 0.62,
        );
      }

      context.shadowBlur = 13;
      context.shadowColor = mode === "light" ? "#b7ffda" : "#96ffc5";
      drawPath(
        context,
        primaryPath,
        centerX,
        centerY,
        scale,
        mode === "light" ? "#d2ffe8" : "#94f6bd",
        1.7,
        0.88,
      );
      context.shadowBlur = 0;

      let animatedPoint: GeodesicPoint | null = null;
      if (primaryPath.length) {
        const speed = mode === "light" ? 0.055 : 0.022;
        const progress = reduceMotion
          ? primaryPath.length - 1
          : Math.floor(now * speed) % primaryPath.length;
        const point = primaryPath[progress];
        animatedPoint = point;
        const x = centerX + point.x * scale;
        const y = centerY - point.y * scale;
        context.fillStyle = mode === "light" ? "#f5fff9" : "#9affc9";
        context.shadowBlur = 18;
        context.shadowColor = "#79ffb9";
        context.beginPath();
        context.arc(x, y, mode === "light" ? 3.2 : 5, 0, Math.PI * 2);
        context.fill();
        context.shadowBlur = 0;
      }

      context.fillStyle = "rgba(166, 225, 193, 0.62)";
      context.font = "500 10px ui-monospace, monospace";
      context.textAlign = "left";
      context.fillText(
        "r = rₛ · EVENT HORIZON",
        centerX + horizonRadius + 8,
        centerY - 6,
      );
      context.fillStyle = "rgba(244, 198, 124, 0.68)";
      context.fillText(
        "r = 1.5 rₛ · PHOTON SPHERE",
        centerX + photonRadius + 8,
        centerY + 14,
      );

      if (width >= 700 && height >= 560) {
        const panelX = 24;
        const panelY = height - 190;
        const panelWidth = Math.min(350, width * 0.34);
        const panelHeight = 148;
        const plotLeft = panelX + 14;
        const plotTop = panelY + 38;
        const plotWidth = panelWidth - 28;
        const plotHeight = panelHeight - 54;
        const minR = 1.04;
        const maxR = Math.max(
          8,
          Math.min(viewRadius * 0.82, mode === "massive" ? 18 : 12),
        );
        const samples = Array.from({ length: 150 }, (_, index) => {
          const r = minR + (index / 149) * (maxR - minR);
          const potential =
            mode === "massive"
              ? (1 - 1 / r) * (1 + angularMomentum ** 2 / r ** 2)
              : (impactParameter ** 2 * (1 - 1 / r)) / r ** 2;
          return { r, potential };
        });
        const energyLine = mode === "massive" ? energy ** 2 : 1;
        const maxPotential = Math.max(
          energyLine * 1.12,
          ...samples.map((sample) => sample.potential),
        );
        const xFor = (r: number) =>
          plotLeft + ((r - minR) / (maxR - minR)) * plotWidth;
        const yFor = (value: number) =>
          plotTop + plotHeight - (value / maxPotential) * plotHeight;

        context.fillStyle = "rgba(1, 9, 6, 0.76)";
        context.strokeStyle = "rgba(143, 235, 183, 0.23)";
        context.fillRect(panelX, panelY, panelWidth, panelHeight);
        context.strokeRect(panelX, panelY, panelWidth, panelHeight);
        context.fillStyle = "rgba(226, 255, 239, 0.9)";
        context.font = "600 11px system-ui, sans-serif";
        context.fillText(
          mode === "massive"
            ? "EFFECTIVE POTENTIAL · V²(r)"
            : "PHOTON POTENTIAL · V²(r)",
          panelX + 14,
          panelY + 21,
        );
        context.strokeStyle = "rgba(214, 255, 232, 0.38)";
        context.setLineDash([4, 5]);
        context.beginPath();
        context.moveTo(plotLeft, yFor(energyLine));
        context.lineTo(plotLeft + plotWidth, yFor(energyLine));
        context.stroke();
        context.setLineDash([]);
        context.strokeStyle = "rgba(129, 237, 178, 0.88)";
        context.lineWidth = 1.4;
        context.beginPath();
        samples.forEach((sample, index) => {
          const x = xFor(sample.r);
          const y = yFor(sample.potential);
          if (index === 0) context.moveTo(x, y);
          else context.lineTo(x, y);
        });
        context.stroke();
        if (animatedPoint) {
          const markerR = Math.max(minR, Math.min(maxR, animatedPoint.r));
          const markerPotential =
            mode === "massive"
              ? (1 - 1 / markerR) * (1 + angularMomentum ** 2 / markerR ** 2)
              : (impactParameter ** 2 * (1 - 1 / markerR)) / markerR ** 2;
          context.fillStyle = "#d8ffe8";
          context.beginPath();
          context.arc(
            xFor(markerR),
            yFor(markerPotential),
            3.5,
            0,
            Math.PI * 2,
          );
          context.fill();
        }
      }

      if (!reduceMotion) frame = requestAnimationFrame(render);
    };

    render(0);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [
    angularMomentum,
    bundlePaths,
    energy,
    ghostPath,
    impactParameter,
    mode,
    persistentTrails,
    primaryPath,
    viewRadius,
  ]);

  return <canvas ref={canvasRef} />;
}

function outcomeLabel(outcome: "captured" | "scattered" | "critical") {
  if (outcome === "captured") return "Captured by horizon";
  if (outcome === "scattered") return "Escapes to infinity";
  return "Near-critical orbit";
}

export function GeodesicsSimulation() {
  const [mode, setMode] = useState<GeodesicMode>("light");
  const [impact, setImpact] = useState(3.15);
  const [semiLatus, setSemiLatus] = useState(12);
  const [eccentricity, setEccentricity] = useState(0.45);
  const [showBundle, setShowBundle] = useState(true);
  const [showNewtonian, setShowNewtonian] = useState(true);
  const [showPersistentTrails, setShowPersistentTrails] = useState(true);
  const [persistentTrails, setPersistentTrails] = useState<GeodesicPoint[][]>(
    [],
  );
  const previousTraceRef = useRef<{
    key: string;
    points: GeodesicPoint[];
  } | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [hudOpen, setHudOpen] = useState(false);

  const nullResult = useMemo(() => traceNullGeodesic(impact), [impact]);
  const timelikeResult = useMemo(
    () => traceTimelikeGeodesic(semiLatus, eccentricity),
    [eccentricity, semiLatus],
  );
  const bundlePaths = useMemo(() => {
    if (mode !== "light" || !showBundle) return [];
    return [-0.8, -0.4, 0.4, 0.8].map(
      (offset) => traceNullGeodesic(Math.max(1.6, impact + offset)).points,
    );
  }, [impact, mode, showBundle]);

  const primaryPath =
    mode === "light" ? nullResult.points : timelikeResult.points;
  const activeTraceKey =
    mode === "light"
      ? `light:${impact.toFixed(4)}`
      : `massive:${semiLatus.toFixed(3)}:${eccentricity.toFixed(3)}`;
  const ghostPath = useMemo(
    () =>
      mode === "massive" && showNewtonian
        ? newtonianOrbit(semiLatus, eccentricity)
        : [],
    [eccentricity, mode, semiLatus, showNewtonian],
  );
  const viewRadius =
    mode === "light" ? 25.5 : Math.max(8, timelikeResult.apoapsis * 1.12);
  const status =
    mode === "light" ? outcomeLabel(nullResult.outcome) : "Stable bound orbit";

  useEffect(() => {
    const previous = previousTraceRef.current;
    if (previous && previous.key !== activeTraceKey) {
      setPersistentTrails((current) => [...current, previous.points].slice(-5));
    }
    previousTraceRef.current = { key: activeTraceKey, points: primaryPath };
  }, [activeTraceKey, primaryPath]);

  function setPreset(value: "capture" | "critical" | "scatter") {
    setMode("light");
    if (value === "capture") setImpact(2.35);
    if (value === "critical") setImpact(CRITICAL_PHOTON_IMPACT);
    if (value === "scatter") setImpact(3.4);
  }

  function reset() {
    setMode("light");
    setImpact(3.15);
    setSemiLatus(12);
    setEccentricity(0.45);
    setShowBundle(true);
    setShowNewtonian(true);
    setShowPersistentTrails(true);
    setPersistentTrails([]);
    previousTraceRef.current = null;
  }

  return (
    <main className="physics-shell geodesics-shell">
      <nav className="spacetime-topbar" aria-label="Simulation navigation">
        <Link href="/" className="spacetime-back">
          <span aria-hidden="true">←</span>
          <span>Mission select</span>
        </Link>
        <div className="spacetime-mission-id">
          <span>05</span>
          <b>Motion</b>
        </div>
      </nav>

      <button
        type="button"
        className="physics-controls-toggle spacetime-objects-toggle"
        onClick={() => setPanelOpen((open) => !open)}
        aria-expanded={panelOpen}
        aria-controls="geodesic-controls"
      >
        <span>Trajectory</span>
        <b aria-hidden="true">↝</b>
      </button>

      <aside
        id="geodesic-controls"
        className={
          panelOpen
            ? "physics-controls is-open spacetime-controls"
            : "physics-controls spacetime-controls"
        }
        aria-label="Geodesic parameters"
      >
        <header className="spacetime-controls-header">
          <div>
            <span className="spacetime-panel-kicker">
              Change the conditions
            </span>
            <h2>Trajectory lab</h2>
          </div>
          <button
            type="button"
            className="spacetime-panel-close"
            onClick={() => setPanelOpen(false)}
            aria-label="Close trajectory parameters"
          >
            ×
          </button>
        </header>

        <div className="spacetime-controls-summary">
          <span>
            <b>{mode === "light" ? "Null" : "Timelike"}</b>
            worldline
          </span>
          <span>
            <b>
              {mode === "light"
                ? `${nullResult.closestRadius.toFixed(3)} rₛ`
                : `${timelikeResult.precessionDegrees === null ? "—" : `+${timelikeResult.precessionDegrees.toFixed(1)}°`}`}
            </b>
            {mode === "light" ? "closest radius" : "advance / orbit"}
          </span>
        </div>

        <div className="black-hole-control-list">
          <section className="black-hole-control-section">
            <div className="black-hole-control-heading">
              <span aria-hidden="true">01</span>
              <div>
                <h3>Worldline</h3>
                <p>Trace light or a freely falling massive particle.</p>
              </div>
            </div>
            <fieldset className="physics-segmented">
              <legend className="sr-only">Geodesic type</legend>
              <button
                type="button"
                className={mode === "light" ? "is-active" : undefined}
                onClick={() => setMode("light")}
              >
                Light ray
              </button>
              <button
                type="button"
                className={mode === "massive" ? "is-active" : undefined}
                onClick={() => setMode("massive")}
              >
                Massive body
              </button>
            </fieldset>
          </section>

          {mode === "light" ? (
            <>
              <section className="black-hole-control-section">
                <div className="black-hole-control-heading">
                  <span aria-hidden="true">02</span>
                  <div>
                    <h3>Photon launch</h3>
                    <p>Set the asymptotic impact parameter b = L/E.</p>
                  </div>
                </div>
                <fieldset className="physics-preset-grid">
                  <legend className="sr-only">Photon trajectory presets</legend>
                  <button type="button" onClick={() => setPreset("capture")}>
                    Capture
                  </button>
                  <button type="button" onClick={() => setPreset("critical")}>
                    Critical
                  </button>
                  <button type="button" onClick={() => setPreset("scatter")}>
                    Scatter
                  </button>
                </fieldset>
                <label className="black-hole-range-field">
                  <span>
                    Impact parameter <b>{impact.toFixed(3)} rₛ</b>
                  </span>
                  <input
                    type="range"
                    min={1.8}
                    max={5.5}
                    step={0.01}
                    value={impact}
                    onChange={(event) => setImpact(Number(event.target.value))}
                  />
                  <small>
                    Critical capture: bᶜ = 3√3 rₛ/2 ={" "}
                    {CRITICAL_PHOTON_IMPACT.toFixed(4)} rₛ.
                  </small>
                </label>
                <label className="black-hole-switch-row">
                  <span>
                    <b>Neighboring rays</b>
                    <small>Trace a bundle through the same metric</small>
                  </span>
                  <input
                    type="checkbox"
                    checked={showBundle}
                    onChange={(event) => setShowBundle(event.target.checked)}
                  />
                  <i aria-hidden="true" />
                </label>
              </section>
              <section className="black-hole-control-section">
                <div className="black-hole-control-heading">
                  <span aria-hidden="true">03</span>
                  <div>
                    <h3>Ray-trace result</h3>
                    <p>{status}</p>
                  </div>
                </div>
                <p className="physics-equation">r̈ = L²/r³ − 3L²rₛ/2r⁴</p>
                <div className="physics-data-row">
                  <span>Deflection</span>
                  <b>
                    {nullResult.deflectionDegrees === null
                      ? "—"
                      : `${nullResult.deflectionDegrees.toFixed(2)}°`}
                  </b>
                </div>
              </section>
            </>
          ) : (
            <>
              <section className="black-hole-control-section">
                <div className="black-hole-control-heading">
                  <span aria-hidden="true">02</span>
                  <div>
                    <h3>Bound orbit</h3>
                    <p>Use Darwin’s exact p–e parameterization.</p>
                  </div>
                </div>
                <label className="black-hole-range-field">
                  <span>
                    Semi-latus rectum <b>{semiLatus.toFixed(1)} GM/c²</b>
                  </span>
                  <input
                    type="range"
                    min={6 + 2 * eccentricity + 0.05}
                    max={24}
                    step={0.1}
                    value={semiLatus}
                    onChange={(event) =>
                      setSemiLatus(Number(event.target.value))
                    }
                  />
                </label>
                <label className="black-hole-range-field">
                  <span>
                    Eccentricity <b>{eccentricity.toFixed(2)}</b>
                  </span>
                  <input
                    type="range"
                    min={0.05}
                    max={0.7}
                    step={0.01}
                    value={eccentricity}
                    onChange={(event) => {
                      const next = Number(event.target.value);
                      setEccentricity(next);
                      setSemiLatus((current) =>
                        Math.max(current, 6 + 2 * next + 0.05),
                      );
                    }}
                  />
                  <small>The stable region requires p &gt; 6 + 2e.</small>
                </label>
              </section>
              <section className="black-hole-control-section">
                <div className="black-hole-control-heading">
                  <span aria-hidden="true">03</span>
                  <div>
                    <h3>Constants of motion</h3>
                    <p>Specific energy and angular momentum are conserved.</p>
                  </div>
                </div>
                <div className="physics-data-row">
                  <span>Energy E</span>
                  <b>{timelikeResult.energy.toFixed(6)}</b>
                </div>
                <div className="physics-data-row">
                  <span>Angular momentum L</span>
                  <b>{timelikeResult.angularMomentum.toFixed(4)} rₛ</b>
                </div>
                <div className="physics-data-row">
                  <span>Periapsis advance</span>
                  <b>
                    {timelikeResult.precessionDegrees?.toFixed(2) ?? "—"}° /
                    orbit
                  </b>
                </div>
                <p className="physics-note">
                  The same relativistic effect produces Mercury’s 43″ per
                  century in the weak-field limit.
                </p>
              </section>
            </>
          )}

          <section className="black-hole-control-section">
            <div className="black-hole-control-heading">
              <span aria-hidden="true">04</span>
              <div>
                <h3>Overlays</h3>
                <p>Keep comparisons visible while exploring parameter space.</p>
              </div>
            </div>
            {mode === "massive" && (
              <label className="black-hole-switch-row">
                <span>
                  <b>Newtonian ghost</b>
                  <small>Closed Kepler ellipse for the same p and e</small>
                </span>
                <input
                  type="checkbox"
                  checked={showNewtonian}
                  onChange={(event) => setShowNewtonian(event.target.checked)}
                />
                <i aria-hidden="true" />
              </label>
            )}
            <label className="black-hole-switch-row">
              <span>
                <b>Persistent trails</b>
                <small>Keep the last five flights dimmed underneath</small>
              </span>
              <input
                type="checkbox"
                checked={showPersistentTrails}
                onChange={(event) =>
                  setShowPersistentTrails(event.target.checked)
                }
              />
              <i aria-hidden="true" />
            </label>
            <button
              type="button"
              className="physics-secondary-action"
              onClick={() => setPersistentTrails([])}
              disabled={persistentTrails.length === 0}
            >
              Clear trails
            </button>
          </section>
        </div>
        <footer className="black-hole-controls-actions spacetime-controls-actions">
          <button type="button" onClick={reset}>
            <span aria-hidden="true">↺</span>Reset parameters
          </button>
        </footer>
      </aside>

      <button
        type="button"
        className="spacetime-info-toggle"
        onClick={() => setHudOpen((open) => !open)}
        aria-expanded={hudOpen}
        aria-controls="geodesics-instructions"
        aria-label={hudOpen ? "Hide instructions" : "Show instructions"}
      >
        {hudOpen ? "×" : "?"}
      </button>

      <section
        id="geodesics-instructions"
        className={
          hudOpen
            ? "is-open physics-brief spacetime-brief"
            : "physics-brief spacetime-brief"
        }
        aria-label="Simulation instructions"
      >
        <p className="spacetime-eyebrow">Schwarzschild trajectory integrator</p>
        <h1>Geodesics</h1>
        <p className="spacetime-brief-copy">
          Follow exact equatorial geodesics through Schwarzschild spacetime,
          integrated with fourth-order Runge–Kutta steps.
        </p>
        <div className="spacetime-readout">
          <span>
            <b>{mode === "light" ? "c" : "m > 0"}</b>
            {mode === "light" ? "null path" : "timelike path"}
          </span>
          <span>
            <b>
              {mode === "massive" && timelikeResult.precessionDegrees !== null
                ? `+${timelikeResult.precessionDegrees.toFixed(1)}° / orbit`
                : status}
            </b>
            {mode === "massive" ? "periapsis advance" : "integration outcome"}
          </span>
        </div>
        <div className="spacetime-instructions">
          <div>
            <span className="spacetime-instruction-number">1</span>
            <p>
              <b>Approach critical b</b>Watch a photon wind around r = 1.5 rₛ
            </p>
          </div>
          <div>
            <span className="spacetime-instruction-number">2</span>
            <p>
              <b>Choose a massive body</b>Reveal relativistic periapsis advance
            </p>
          </div>
        </div>
      </section>

      <section
        className="physics-canvas"
        aria-label="Numerically integrated Schwarzschild geodesics"
      >
        <GeodesicField
          mode={mode}
          primaryPath={primaryPath}
          bundlePaths={bundlePaths}
          ghostPath={ghostPath}
          persistentTrails={showPersistentTrails ? persistentTrails : []}
          viewRadius={viewRadius}
          energy={timelikeResult.energy}
          angularMomentum={timelikeResult.angularMomentum}
          impactParameter={impact}
        />
      </section>
      <div className="physics-formula-strip" aria-live="polite">
        <span>Integrator</span>
        <b>Exact Schwarzschild · RK4</b>
      </div>
      <div className="spacetime-vignette" aria-hidden="true" />
      <div className="spacetime-grain" aria-hidden="true" />
    </main>
  );
}
