"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { SIMULATIONS, type SimulationMeta } from "@/constants/simulations";

const MISSION_ORDER = [
  "spacetime",
  "black-hole",
  "lensing",
  "time-dilation",
  "geodesics",
  "waves",
] as const;

const MISSION_DETAILS: Record<
  (typeof MISSION_ORDER)[number],
  { category: string; shortDescription: string; artClass: string }
> = {
  spacetime: {
    category: "Geometry",
    shortDescription: "See how mass changes the shape of space.",
    artClass: "spacetime",
  },
  "black-hole": {
    category: "Extreme gravity",
    shortDescription: "Approach the event horizon and the limit of escape.",
    artClass: "black-hole",
  },
  lensing: {
    category: "Light",
    shortDescription: "Watch massive objects bend light into arcs and rings.",
    artClass: "lensing",
  },
  "time-dilation": {
    category: "Time",
    shortDescription: "Compare how clocks move near mass and far away.",
    artClass: "time",
  },
  geodesics: {
    category: "Motion",
    shortDescription: "Follow natural paths through curved spacetime.",
    artClass: "geodesic",
  },
  waves: {
    category: "Waves",
    shortDescription: "Visualize ripples moving through spacetime.",
    artClass: "waves",
  },
};

type LandingMission = SimulationMeta & {
  category: string;
  shortDescription: string;
  artClass: string;
};

function MissionArtwork({
  mission,
  priority = false,
}: {
  mission: LandingMission;
  priority?: boolean;
}) {
  if (mission.thumbnail) {
    return (
      <Image
        src={mission.thumbnail}
        alt=""
        fill
        priority={priority}
        sizes="(max-width: 620px) 100vw, (max-width: 900px) 50vw, 34vw"
      />
    );
  }

  return (
    <span
      className={`landing-concept-art landing-concept-${mission.artClass}`}
      aria-hidden="true"
    />
  );
}

function MissionCard({
  mission,
  index,
  selected,
  onPreview,
  onPreviewEnd,
}: {
  mission: LandingMission;
  index: number;
  selected: boolean;
  onPreview: () => void;
  onPreviewEnd: () => void;
}) {
  const available = mission.status === "available";
  const content = (
    <>
      <MissionArtwork mission={mission} priority={index < 2} />
      <span className="landing-mission-top">
        <span className="landing-mission-number">
          <b>{String(index + 1).padStart(2, "0")}</b>
          {mission.category}
        </span>
        <span
          className={`landing-availability${available ? "" : " is-locked"}`}
        >
          {available ? "Online" : "In development"}
        </span>
      </span>
      <span className="landing-mission-copy">
        <h2>{mission.title}</h2>
        <p>{mission.shortDescription}</p>
      </span>
      {available && (
        <span className="landing-mission-launch">
          Launch <b aria-hidden="true">→</b>
        </span>
      )}
    </>
  );

  if (available) {
    return (
      <Link
        href={mission.route}
        className={`landing-mission is-live${selected ? " is-selected" : ""}`}
        data-mission={mission.id}
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
      className={`landing-mission${selected ? " is-selected" : ""}`}
      data-mission={mission.id}
      aria-disabled="true"
      onMouseEnter={onPreview}
      onMouseLeave={onPreviewEnd}
    >
      {content}
    </article>
  );
}

export default function Home() {
  const missions = useMemo(
    () =>
      MISSION_ORDER.map((id) => {
        const simulation = SIMULATIONS.find((item) => item.id === id);
        if (!simulation) {
          throw new Error(`Missing simulation metadata for ${id}`);
        }
        return { ...simulation, ...MISSION_DETAILS[id] };
      }),
    [],
  );
  const [activeMission, setActiveMission] = useState(0);
  const [rotationPaused, setRotationPaused] = useState(false);
  const availableMissionCount = missions.filter(
    (mission) => mission.status === "available",
  ).length;

  useEffect(() => {
    if (rotationPaused) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const rotation = window.setInterval(() => {
      setActiveMission((current) => (current + 1) % missions.length);
    }, 6500);

    return () => window.clearInterval(rotation);
  }, [missions.length, rotationPaused]);

  function previewMission(index: number) {
    setRotationPaused(true);
    setActiveMission(index);
  }

  return (
    <div className="landing-shell">
      <section className="landing-stage">
        <div className="landing-hero-slides" aria-hidden="true">
          {missions.map((mission, index) => (
            <div
              key={mission.id}
              className={`landing-hero-slide${
                activeMission === index ? " is-active" : ""
              }${mission.id === "black-hole" ? " is-black-hole" : ""}`}
            >
              <MissionArtwork mission={mission} priority={index < 2} />
            </div>
          ))}
        </div>

        <Link className="landing-brand" href="/">
          <Image src="/favicon.ico" alt="" width={28} height={28} />
          <span>Relativity Playground</span>
        </Link>

        <a
          className="landing-github"
          href="https://github.com/stephenw310/general-relativity-playground"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="View Relativity Playground on GitHub"
        >
          <span className="sr-only">GitHub</span>
        </a>

        <div className="landing-stage-copy">
          <p className="landing-context">
            An interactive relativity playground
          </p>
          <h1>Play with spacetime.</h1>
          <p className="landing-intro">
            Choose a simulation, change the conditions, and see how space, time,
            light, and motion respond.
          </p>
        </div>
      </section>

      <main className="landing-mission-select">
        <div className="landing-mission-bar">
          <strong>Mission select</strong>
          <span className="landing-mission-count">
            {availableMissionCount}{" "}
            {availableMissionCount === 1 ? "mission" : "missions"} available
          </span>
        </div>

        <div className="landing-mission-grid">
          {missions.map((mission, index) => (
            <MissionCard
              key={mission.id}
              mission={mission}
              index={index}
              selected={activeMission === index}
              onPreview={() => previewMission(index)}
              onPreviewEnd={() => setRotationPaused(false)}
            />
          ))}
        </div>
      </main>
    </div>
  );
}
