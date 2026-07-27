import Link from "next/link";
import { SimulationCard } from "@/components/simulation-card";
import { SIMULATIONS } from "@/constants/simulations";

export default function Home() {
  return (
    <div className="min-h-screen bg-black text-white">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-b from-black to-gray-950 py-20 md:py-32 lg:py-40">
        <div className="mx-auto max-w-7xl px-4 md:px-6">
          <div className="flex flex-col items-center space-y-8 text-center">
            <div className="space-y-4">
              <h1 className="font-bold text-4xl text-white tracking-tighter sm:text-5xl md:text-6xl lg:text-7xl">
                General Relativity
                <span className="block text-blue-400">Playground</span>
              </h1>
              <p className="mx-auto max-w-[700px] text-gray-300 text-lg md:text-xl">
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
                className="inline-flex h-10 cursor-pointer items-center justify-center rounded-md border border-blue-400 bg-transparent px-8 text-blue-400 text-lg hover:bg-blue-400/25"
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
            <h2 className="mb-4 font-bold text-3xl text-white tracking-tighter sm:text-4xl md:text-5xl">
              Simulations
            </h2>
            <p className="mx-auto max-w-[600px] text-gray-300 text-lg">
              Explore fundamental concepts through interactive experiments.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {SIMULATIONS.map(({ id, ...simulation }) => (
              <SimulationCard key={id} {...simulation} />
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-gray-800 border-t bg-black">
        <div className="mx-auto max-w-7xl px-4 py-8 md:px-6">
          <div className="space-y-4 text-center">
            <div className="text-gray-500 text-sm">
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
