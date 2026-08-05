import type { Metadata } from "next";
import { GravitationalWavesSimulation } from "@/components/gravitational-waves-simulation";

export const metadata: Metadata = {
  title: "Gravitational Waves",
  description:
    "Build a compact binary and inspect its quadrupole waveform, polarization, strain, frequency, and Peters inspiral.",
};

export default function GravitationalWavesPage() {
  return <GravitationalWavesSimulation />;
}
