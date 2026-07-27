import { Metadata } from "next";
import { BlackHoleSimulation } from "@/components/black-hole-simulation";

export const metadata: Metadata = {
  title: "Black Holes",
  description:
    "Orbit a Schwarzschild black hole: event horizon, photon sphere, accretion disk, and gravitational lensing of the background stars.",
};

export default function BlackHolePage() {
  return <BlackHoleSimulation />;
}
