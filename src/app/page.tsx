"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { SIMULATIONS, type SimulationMeta } from "@/constants/simulations";

const SIMULATION_ORDER = [
  "spacetime",
  "black-hole",
  "lensing",
  "descent",
  "time-dilation",
  "geodesics",
  "waves",
] as const;

const SIMULATION_DETAILS: Record<
  (typeof SIMULATION_ORDER)[number],
  { shortDescription: string; artClass: string }
> = {
  descent: {
    shortDescription:
      "Pilot a spaceship through the event horizon, one moment at a time.",
    artClass: "black-hole",
  },
  spacetime: {
    shortDescription: "See how mass changes the shape of space.",
    artClass: "spacetime",
  },
  "black-hole": {
    shortDescription: "Approach the event horizon and the limit of escape.",
    artClass: "black-hole",
  },
  lensing: {
    shortDescription: "Watch massive objects bend light into arcs and rings.",
    artClass: "lensing",
  },
  "time-dilation": {
    shortDescription: "Compare how clocks move near mass and far away.",
    artClass: "time",
  },
  geodesics: {
    shortDescription: "Follow natural paths through curved spacetime.",
    artClass: "geodesic",
  },
  waves: {
    shortDescription: "Visualize ripples moving through spacetime.",
    artClass: "waves",
  },
};

type LandingSimulation = SimulationMeta & {
  shortDescription: string;
  artClass: string;
};

function SimulationArtwork({
  simulation,
  priority = false,
}: {
  simulation: LandingSimulation;
  priority?: boolean;
}) {
  if (simulation.thumbnail) {
    return (
      <Image
        src={simulation.thumbnail}
        alt=""
        fill
        priority={priority}
        sizes="(max-width: 620px) 100vw, (max-width: 900px) 50vw, 34vw"
      />
    );
  }

  return (
    <span
      className={`landing-concept-art landing-concept-${simulation.artClass}`}
      aria-hidden="true"
    />
  );
}

function SimulationCard({
  simulation,
  index,
  selected,
  onPreview,
  onPreviewEnd,
}: {
  simulation: LandingSimulation;
  index: number;
  selected: boolean;
  onPreview: () => void;
  onPreviewEnd: () => void;
}) {
  const available = simulation.status === "available";
  const content = (
    <>
      <SimulationArtwork simulation={simulation} priority={index < 2} />
      {!available && (
        <span className="landing-availability">In development</span>
      )}
      <span className="landing-simulation-copy">
        <h2>{simulation.title}</h2>
        <p>{simulation.shortDescription}</p>
      </span>
      {available && (
        <span className="landing-simulation-launch">
          Explore <b aria-hidden="true">→</b>
        </span>
      )}
    </>
  );

  if (available) {
    return (
      <Link
        href={simulation.route}
        className={`landing-simulation is-live ${selected ? "is-selected" : ""}`}
        data-simulation={simulation.id}
        onMouseEnter={onPreview}
        onMouseLeave={onPreviewEnd}
        onFocus={onPreview}
        onBlur={onPreviewEnd}
      >
        {content}
      </Link>
    );
  }

  return (
    <article
      className={`landing-simulation ${selected ? "is-selected" : ""}`}
      data-simulation={simulation.id}
      aria-disabled="true"
      onMouseEnter={onPreview}
      onMouseLeave={onPreviewEnd}
    >
      {content}
    </article>
  );
}

export default function Home() {
  const simulations = useMemo(
    () =>
      SIMULATION_ORDER.map((id) => {
        const simulation = SIMULATIONS.find((item) => item.id === id);
        if (!simulation) {
          throw new Error(`Missing simulation metadata for ${id}`);
        }
        return { ...simulation, ...SIMULATION_DETAILS[id] };
      }),
    [],
  );
  const [activeSimulation, setActiveSimulation] = useState(0);
  const [rotationPaused, setRotationPaused] = useState(false);

  useEffect(() => {
    if (rotationPaused) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const rotation = window.setInterval(() => {
      setActiveSimulation((current) => (current + 1) % simulations.length);
    }, 6500);

    return () => window.clearInterval(rotation);
  }, [simulations.length, rotationPaused]);

  function previewSimulation(index: number) {
    setRotationPaused(true);
    setActiveSimulation(index);
  }

  return (
    <div className="landing-shell">
      <section className="landing-stage">
        <div className="landing-hero-slides" aria-hidden="true">
          {simulations.map((simulation, index) => (
            <div
              key={simulation.id}
              className={`landing-hero-slide ${
                activeSimulation === index ? "is-active" : ""
              } ${simulation.id === "black-hole" ? "is-black-hole" : ""}`}
            >
              <SimulationArtwork simulation={simulation} priority={index < 2} />
            </div>
          ))}
        </div>

        <Link className="landing-brand" href="/">
          <Image src="/favicon.ico" alt="" width={28} height={28} />
          <span>Universe Lab</span>
        </Link>

        <a
          className="landing-github"
          href="https://github.com/stephenw310/universe-lab"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="View Universe Lab on GitHub"
        >
          <span className="sr-only">GitHub</span>
        </a>

        <div className="landing-stage-copy">
          <h1>Explore spacetime.</h1>
          <p className="landing-intro">
            Choose a simulation, change the conditions, and see how space, time,
            light, and motion respond.
          </p>
        </div>
      </section>

      <main className="landing-simulation-select" aria-label="Simulations">
        <div className="landing-simulation-grid">
          {simulations.map((simulation, index) => (
            <SimulationCard
              key={simulation.id}
              simulation={simulation}
              index={index}
              selected={activeSimulation === index}
              onPreview={() => previewSimulation(index)}
              onPreviewEnd={() => setRotationPaused(false)}
            />
          ))}
        </div>
      </main>
    </div>
  );
}
