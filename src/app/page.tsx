"use client";

import Link from "next/link";
import { SimulationCard } from "@/components/simulation-card";

export default function Home() {
  const simulations = [
    {
      id: "spacetime",
      title: "Spacetime Curvature",
      description:
        "Drop masses on a rubber sheet and watch spacetime curve in real-time.",
      route: "/spacetime",
      status: "available" as const,
      thumbnail: "/spacetime-preview.jpg", // Add thumbnail when available
    },
    {
      id: "lensing",
      title: "Gravitational Lensing",
      description:
        "See how massive objects bend light and create Einstein rings.",
      route: "/lensing",
      status: "coming-soon" as const,
    },
    {
      id: "time-dilation",
      title: "Time Dilation",
      description:
        "Watch time slow down near massive objects and speed up in empty space.",
      route: "/time-dilation",
      status: "coming-soon" as const,
    },
    {
      id: "geodesics",
      title: "Geodesics",
      description:
        "Follow the paths of particles and light through curved spacetime.",
      route: "/geodesics",
      status: "coming-soon" as const,
    },
    {
      id: "black-hole",
      title: "Black Holes",
      description:
        "Journey to the event horizon and explore extreme spacetime curvature.",
      route: "/black-hole",
      status: "coming-soon" as const,
    },
    {
      id: "waves",
      title: "Gravitational Waves",
      description:
        "Visualize ripples in spacetime created by accelerating masses.",
      route: "/gravitational-waves",
      status: "coming-soon" as const,
    },
  ];

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-b from-black to-gray-950 py-20 md:py-32 lg:py-40">
        <div className="mx-auto max-w-7xl px-4 md:px-6">
          <div className="flex flex-col items-center space-y-8 text-center">
            <div className="space-y-4">
              <h1 className="text-4xl font-bold tracking-tighter text-white sm:text-5xl md:text-6xl lg:text-7xl">
                General Relativity
                <span className="block text-blue-400">Playground</span>
              </h1>
              <p className="mx-auto max-w-[700px] text-lg text-gray-300 md:text-xl">
                Interactive simulations to explore Einstein&apos;s theory of
                spacetime.
              </p>
            </div>
            <div className="flex flex-col gap-4 sm:flex-row">
              <Link
                href="#simulations"
                className="inline-flex h-10 cursor-pointer items-center justify-center rounded-md bg-blue-600 px-8 text-lg text-white hover:bg-blue-700"
              >
                <span className="mr-2">▶</span>
                Start Exploring
              </Link>
              <Link
                href="https://github.com/stephenw310/general-relativity-playground"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-10 cursor-pointer items-center justify-center rounded-md border border-blue-400 bg-transparent px-8 text-lg text-blue-400 hover:bg-blue-400/25"
              >
                <span className="mr-2">⭐</span>
                Star on GitHub
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Simulations Grid */}
      <section id="simulations" className="bg-gray-950 py-10">
        <div className="mx-auto max-w-7xl px-4 md:px-6">
          <div className="mb-12 text-center">
            <h2 className="mb-4 text-3xl font-bold tracking-tighter text-white sm:text-4xl md:text-5xl">
              Simulations
            </h2>
            <p className="mx-auto max-w-[600px] text-lg text-gray-300">
              Explore fundamental concepts through interactive experiments.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {simulations.map((simulation) => (
              <SimulationCard
                key={simulation.id}
                title={simulation.title}
                description={simulation.description}
                route={simulation.route}
                status={simulation.status}
                thumbnail={simulation.thumbnail}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-800 bg-black">
        <div className="mx-auto max-w-7xl px-4 py-8 md:px-6">
          <div className="space-y-4 text-center">
            <div className="text-sm text-gray-500">
              <p>
                &copy; {new Date().getFullYear()} General Relativity Playground.
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
