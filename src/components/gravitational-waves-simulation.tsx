"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { getBinaryParameters } from "@/utils/relativity-calculations";

function formatDuration(seconds: number) {
  if (seconds < 0.001) return `${(seconds * 1e6).toFixed(0)} μs`;
  if (seconds < 1) return `${(seconds * 1000).toFixed(1)} ms`;
  if (seconds < 120) return `${seconds.toFixed(1)} s`;
  return `${(seconds / 60).toFixed(1)} min`;
}

function formatStrain(value: number) {
  if (!Number.isFinite(value) || value === 0) return "0";
  const exponent = Math.floor(Math.log10(Math.abs(value)));
  return `${(value / 10 ** exponent).toFixed(2)} × 10${String(exponent).replace("-", "⁻")}`;
}

function BinaryWaveField({
  massOne,
  massTwo,
  initialSeparation,
  distance,
  inclination,
  animate,
}: {
  massOne: number;
  massTwo: number;
  initialSeparation: number;
  distance: number;
  inclination: number;
  animate: boolean;
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
    const totalMass = massOne + massTwo;
    const eta = (massOne * massTwo) / totalMass ** 2;
    const cosInclination = Math.cos((inclination * Math.PI) / 180);
    const minimumSeparation = Math.min(6, initialSeparation * 0.8);
    let width = 0;
    let height = 0;
    let frame = 0;
    const startTime = performance.now();

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
      const displaySeconds = (now - startTime) / 1000;
      const progress =
        animate && !reduceMotion ? (displaySeconds % 18) / 18 : 0;
      const separation = Math.max(
        minimumSeparation,
        (initialSeparation ** 4 -
          progress * (initialSeparation ** 4 - minimumSeparation ** 4)) **
          0.25,
      );
      const phase =
        (initialSeparation ** 2.5 - separation ** 2.5) / (32 * eta) +
        (animate ? 0 : -0.65);
      const binary = getBinaryParameters(
        massOne,
        massTwo,
        separation,
        distance,
      );

      context.clearRect(0, 0, width, height);
      const centerX = width * (width < 768 ? 0.5 : 0.51);
      const centerY = height * (width < 768 ? 0.44 : 0.46);
      const background = context.createRadialGradient(
        centerX,
        centerY,
        0,
        centerX,
        centerY,
        Math.max(width, height) * 0.75,
      );
      background.addColorStop(0, "#210916");
      background.addColorStop(0.4, "#0b030a");
      background.addColorStop(1, "#030104");
      context.fillStyle = background;
      context.fillRect(0, 0, width, height);

      context.fillStyle = "rgba(255, 186, 219, 0.47)";
      for (let index = 0; index < 155; index += 1) {
        const x = (((index * 787) % 997) / 997) * width;
        const y = (((index * 523) % 991) / 991) * height;
        context.globalAlpha = 0.12 + (index % 9) / 25;
        context.fillRect(x, y, index % 19 === 0 ? 1.4 : 0.65, 0.65);
      }
      context.globalAlpha = 1;

      const waveExtent = Math.min(width, height) * 0.46;
      for (let ring = 0; ring < 11; ring += 1) {
        const offset = (((phase / Math.PI + ring) % 11) + 11) % 11;
        const radius = 28 + (offset / 11) * waveExtent;
        const fade = 1 - radius / (waveExtent + 38);
        context.strokeStyle = `rgba(255, 89, 166, ${0.035 + fade * 0.16})`;
        context.lineWidth = 0.75 + fade;
        context.beginPath();
        context.arc(centerX, centerY, radius, 0, Math.PI * 2);
        context.stroke();
      }

      const visualSeparation =
        54 +
        ((separation - minimumSeparation) /
          Math.max(initialSeparation - minimumSeparation, 1)) *
          Math.min(105, width * 0.11);
      const orbitYScale = Math.abs(cosInclination);
      const oneDistance = visualSeparation * (massTwo / totalMass);
      const twoDistance = visualSeparation * (massOne / totalMass);
      const cosPhase = Math.cos(phase);
      const sinPhase = Math.sin(phase) * orbitYScale;
      const oneX = centerX + cosPhase * oneDistance;
      const oneY = centerY + sinPhase * oneDistance;
      const twoX = centerX - cosPhase * twoDistance;
      const twoY = centerY - sinPhase * twoDistance;

      context.strokeStyle = "rgba(255, 133, 189, 0.18)";
      context.setLineDash([4, 6]);
      context.beginPath();
      context.ellipse(
        centerX,
        centerY,
        oneDistance,
        oneDistance * orbitYScale,
        0,
        0,
        Math.PI * 2,
      );
      context.stroke();
      context.beginPath();
      context.ellipse(
        centerX,
        centerY,
        twoDistance,
        twoDistance * orbitYScale,
        0,
        0,
        Math.PI * 2,
      );
      context.stroke();
      context.setLineDash([]);

      const body = (x: number, y: number, mass: number, color: string) => {
        // Schwarzschild radius is proportional to mass. The shared additive
        // radius keeps both horizons visible without changing their ordering.
        const radius = 6 + (mass / Math.max(totalMass, 1)) * 24;
        const glow = context.createRadialGradient(x, y, 0, x, y, radius * 2.4);
        glow.addColorStop(0, "#fff");
        glow.addColorStop(0.14, color);
        glow.addColorStop(0.42, "rgba(255, 82, 159, 0.3)");
        glow.addColorStop(1, "rgba(255, 50, 135, 0)");
        context.fillStyle = glow;
        context.beginPath();
        context.arc(x, y, radius * 2.4, 0, Math.PI * 2);
        context.fill();
        context.fillStyle = "#020102";
        context.strokeStyle = color;
        context.lineWidth = 1.3;
        context.beginPath();
        context.arc(x, y, radius, 0, Math.PI * 2);
        context.fill();
        context.stroke();
      };
      body(oneX, oneY, massOne, "#ff93c4");
      body(twoX, twoY, massTwo, "#ffd0e5");

      context.fillStyle = "rgba(255, 184, 216, 0.62)";
      context.textAlign = "center";
      context.font = "500 10px ui-monospace, monospace";
      context.fillText(
        `${binary.gravitationalWaveFrequencyHz.toFixed(binary.gravitationalWaveFrequencyHz < 10 ? 2 : 1)} Hz · TWO STRAIN POLARIZATIONS`,
        centerX,
        centerY - waveExtent * 0.77,
      );

      const plotWidth = Math.min(width * 0.5, 540);
      const plotHeight = Math.min(82, height * 0.12);
      const plotLeft = centerX - plotWidth / 2;
      const plotTop = height - (width < 768 ? 128 : 104);
      context.fillStyle = "rgba(9, 2, 8, 0.58)";
      context.strokeStyle = "rgba(255, 145, 197, 0.16)";
      context.fillRect(plotLeft, plotTop, plotWidth, plotHeight);
      context.strokeRect(plotLeft, plotTop, plotWidth, plotHeight);
      context.strokeStyle = "rgba(255, 255, 255, 0.1)";
      context.beginPath();
      context.moveTo(plotLeft, plotTop + plotHeight / 2);
      context.lineTo(plotLeft + plotWidth, plotTop + plotHeight / 2);
      context.stroke();

      const drawPolarization = (cross: boolean, color: string) => {
        context.strokeStyle = color;
        context.lineWidth = 1.3;
        context.beginPath();
        for (let sample = 0; sample <= 180; sample += 1) {
          const x = plotLeft + (sample / 180) * plotWidth;
          const wavePhase = phase - ((180 - sample) / 180) * Math.PI * 6;
          const projection = cross
            ? cosInclination * Math.sin(2 * wavePhase)
            : ((1 + cosInclination ** 2) / 2) * Math.cos(2 * wavePhase);
          const y = plotTop + plotHeight / 2 - projection * plotHeight * 0.35;
          if (sample === 0) context.moveTo(x, y);
          else context.lineTo(x, y);
        }
        context.stroke();
      };
      drawPolarization(false, "rgba(255, 221, 236, 0.9)");
      drawPolarization(true, "rgba(255, 84, 163, 0.72)");
      context.textAlign = "left";
      context.font = "500 9px ui-monospace, monospace";
      context.fillStyle = "rgba(255, 226, 239, 0.82)";
      context.fillText("h₊", plotLeft + 8, plotTop + 14);
      context.fillStyle = "rgba(255, 102, 174, 0.82)";
      context.fillText("h×", plotLeft + 28, plotTop + 14);

      if (!reduceMotion) frame = requestAnimationFrame(render);
    };

    render(startTime);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [animate, distance, inclination, initialSeparation, massOne, massTwo]);

  return <canvas ref={canvasRef} />;
}

export function GravitationalWavesSimulation() {
  const [massOne, setMassOne] = useState(36);
  const [massTwo, setMassTwo] = useState(29);
  const [separation, setSeparation] = useState(14);
  const [distance, setDistance] = useState(410);
  const [inclination, setInclination] = useState(35);
  const [animate, setAnimate] = useState(true);
  const [panelOpen, setPanelOpen] = useState(false);
  const [hudOpen, setHudOpen] = useState(false);

  const binary = useMemo(
    () => getBinaryParameters(massOne, massTwo, separation, distance),
    [distance, massOne, massTwo, separation],
  );

  function loadPreset(preset: "gw150914" | "unequal" | "neutron") {
    if (preset === "gw150914") {
      setMassOne(36);
      setMassTwo(29);
      setSeparation(14);
      setDistance(410);
      setInclination(35);
    } else if (preset === "unequal") {
      setMassOne(55);
      setMassTwo(12);
      setSeparation(18);
      setDistance(700);
      setInclination(68);
    } else {
      setMassOne(1.4);
      setMassTwo(1.4);
      setSeparation(24);
      setDistance(40);
      setInclination(25);
    }
  }

  return (
    <main className="physics-shell waves-shell">
      <nav className="spacetime-topbar" aria-label="Simulation navigation">
        <Link href="/" className="spacetime-back">
          <span aria-hidden="true">←</span>
          <span>Mission select</span>
        </Link>
        <div className="spacetime-mission-id">
          <span>06</span>
          <b>Waves</b>
        </div>
      </nav>

      <button
        type="button"
        className="physics-controls-toggle spacetime-objects-toggle"
        onClick={() => setPanelOpen((open) => !open)}
        aria-expanded={panelOpen}
        aria-controls="wave-controls"
      >
        <span>Binary setup</span>
        <b aria-hidden="true">∿</b>
      </button>

      <aside
        id="wave-controls"
        className={
          panelOpen
            ? "physics-controls is-open spacetime-controls"
            : "physics-controls spacetime-controls"
        }
        aria-label="Gravitational wave parameters"
      >
        <header className="spacetime-controls-header">
          <div>
            <span className="spacetime-panel-kicker">
              Change the conditions
            </span>
            <h2>Binary setup</h2>
          </div>
          <button
            type="button"
            className="spacetime-panel-close"
            onClick={() => setPanelOpen(false)}
            aria-label="Close binary parameters"
          >
            ×
          </button>
        </header>
        <div className="spacetime-controls-summary">
          <span>
            <b>
              {binary.gravitationalWaveFrequencyHz.toFixed(
                binary.gravitationalWaveFrequencyHz < 10 ? 2 : 1,
              )}{" "}
              Hz
            </b>
            GW frequency
          </span>
          <span>
            <b>{binary.chirpMass.toFixed(2)} M☉</b>chirp mass
          </span>
        </div>

        <div className="black-hole-control-list">
          <section className="black-hole-control-section">
            <div className="black-hole-control-heading">
              <span aria-hidden="true">01</span>
              <div>
                <h3>Observed systems</h3>
                <p>Load representative compact binaries.</p>
              </div>
            </div>
            <fieldset className="physics-preset-grid">
              <legend className="sr-only">Binary presets</legend>
              <button type="button" onClick={() => loadPreset("gw150914")}>
                GW150914
              </button>
              <button type="button" onClick={() => loadPreset("unequal")}>
                Unequal
              </button>
              <button type="button" onClick={() => loadPreset("neutron")}>
                Neutron
              </button>
            </fieldset>
          </section>

          <section className="black-hole-control-section">
            <div className="black-hole-control-heading">
              <span aria-hidden="true">02</span>
              <div>
                <h3>Source frame</h3>
                <p>Set component masses and orbital separation.</p>
              </div>
            </div>
            <label className="black-hole-range-field">
              <span>
                Primary mass <b>{massOne.toFixed(1)} M☉</b>
              </span>
              <input
                type="range"
                min={1.2}
                max={80}
                step={0.2}
                value={massOne}
                onChange={(event) => setMassOne(Number(event.target.value))}
              />
            </label>
            <label className="black-hole-range-field">
              <span>
                Secondary mass <b>{massTwo.toFixed(1)} M☉</b>
              </span>
              <input
                type="range"
                min={1.2}
                max={80}
                step={0.2}
                value={massTwo}
                onChange={(event) => setMassTwo(Number(event.target.value))}
              />
            </label>
            <label className="black-hole-range-field">
              <span>
                Separation <b>{separation.toFixed(1)} GM/c²</b>
              </span>
              <input
                type="range"
                min={8}
                max={40}
                step={0.2}
                value={separation}
                onChange={(event) => setSeparation(Number(event.target.value))}
              />
              <small>
                {binary.separationKm.toFixed(0)} km center-to-center;
                quasi-circular leading-order model.
              </small>
            </label>
          </section>

          <section className="black-hole-control-section">
            <div className="black-hole-control-heading">
              <span aria-hidden="true">03</span>
              <div>
                <h3>Observer</h3>
                <p>Projection changes polarization; distance scales strain.</p>
              </div>
            </div>
            <label className="black-hole-range-field">
              <span>
                Distance <b>{distance.toFixed(0)} Mpc</b>
              </span>
              <input
                type="range"
                min={10}
                max={1000}
                step={10}
                value={distance}
                onChange={(event) => setDistance(Number(event.target.value))}
              />
            </label>
            <label className="black-hole-range-field">
              <span>
                Inclination <b>{inclination.toFixed(0)}°</b>
              </span>
              <input
                type="range"
                min={0}
                max={90}
                step={1}
                value={inclination}
                onChange={(event) => setInclination(Number(event.target.value))}
              />
              <small>0° is face-on; h× vanishes at 90° edge-on.</small>
            </label>
            <label className="black-hole-switch-row">
              <span>
                <b>Animate Peters inspiral</b>
                <small>
                  18 display seconds span the physical evolution to 6 GM/c²
                </small>
              </span>
              <input
                type="checkbox"
                checked={animate}
                onChange={(event) => setAnimate(event.target.checked)}
              />
              <i aria-hidden="true" />
            </label>
          </section>

          <section className="black-hole-control-section">
            <div className="black-hole-control-heading">
              <span aria-hidden="true">04</span>
              <div>
                <h3>Leading-order signal</h3>
                <p>Quadrupole strain for a circular binary.</p>
              </div>
            </div>
            <p className="physics-equation">h₀ = 4(Gℳ)⁵ᐟ³(πf)²ᐟ³ / c⁴D</p>
            <div className="physics-data-row">
              <span>Optimal strain h₀</span>
              <b>{formatStrain(binary.strainAmplitude)}</b>
            </div>
            <div className="physics-data-row">
              <span>Peters time to coalescence</span>
              <b>{formatDuration(binary.timeToMergerSeconds)}</b>
            </div>
          </section>
        </div>
        <footer className="black-hole-controls-actions spacetime-controls-actions">
          <button type="button" onClick={() => loadPreset("gw150914")}>
            <span aria-hidden="true">↺</span>Reset parameters
          </button>
        </footer>
      </aside>

      <button
        type="button"
        className="spacetime-info-toggle"
        onClick={() => setHudOpen((open) => !open)}
        aria-expanded={hudOpen}
        aria-controls="waves-instructions"
        aria-label={hudOpen ? "Hide instructions" : "Show instructions"}
      >
        {hudOpen ? "×" : "?"}
      </button>

      <section
        id="waves-instructions"
        className={
          hudOpen
            ? "is-open physics-brief spacetime-brief"
            : "physics-brief spacetime-brief"
        }
        aria-label="Simulation instructions"
      >
        <p className="spacetime-eyebrow">Quadrupole radiation laboratory</p>
        <h1>Gravitational Waves</h1>
        <p className="spacetime-brief-copy">
          Orbiting compact objects radiate two tensor polarizations at twice
          their orbital frequency and slowly spiral together.
        </p>
        <div className="spacetime-readout">
          <span>
            <b>{binary.totalMass.toFixed(1)} M☉</b>total mass
          </span>
          <span>
            <b>{formatStrain(binary.strainAmplitude)}</b>optimal strain
          </span>
        </div>
        <div className="spacetime-instructions">
          <div>
            <span className="spacetime-instruction-number">1</span>
            <p>
              <b>Change the mass ratio</b>Watch the chirp mass set signal
              strength
            </p>
          </div>
          <div>
            <span className="spacetime-instruction-number">2</span>
            <p>
              <b>Tilt the orbit</b>Compare plus and cross polarizations
            </p>
          </div>
        </div>
      </section>

      <section
        className="physics-canvas"
        aria-label="Binary inspiral and gravitational waveform"
      >
        <BinaryWaveField
          massOne={massOne}
          massTwo={massTwo}
          initialSeparation={separation}
          distance={distance}
          inclination={inclination}
          animate={animate}
        />
      </section>
      <div className="physics-formula-strip" aria-live="polite">
        <span>Wave model</span>
        <b>Quadrupole + Peters radiation reaction</b>
      </div>
      <div className="spacetime-vignette" aria-hidden="true" />
      <div className="spacetime-grain" aria-hidden="true" />
    </main>
  );
}
