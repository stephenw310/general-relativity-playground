import type { Metadata } from "next";
import { SpacetimeSimulation } from "@/components/spacetime-simulation";

export const metadata: Metadata = {
  title: "Spacetime Curvature",
  description:
    "Move objects across a field and see how their mass changes the shape of spacetime in real time.",
};

export default function SpacetimePage() {
  return <SpacetimeSimulation />;
}
