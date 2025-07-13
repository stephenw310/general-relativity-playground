import { Metadata } from "next";
import { SpacetimeSimulation } from "@/components/spacetime-simulation";

export const metadata: Metadata = {
  title: "Spacetime Curvature",
  description:
    "Drop masses on a rubber sheet and watch spacetime curve in real-time using authentic Schwarzschild physics.",
};

export default function SpacetimePage() {
  return <SpacetimeSimulation />;
}
