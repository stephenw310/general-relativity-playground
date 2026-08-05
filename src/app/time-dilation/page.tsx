import type { Metadata } from "next";
import { TimeDilationSimulation } from "@/components/time-dilation-simulation";

export const metadata: Metadata = {
  title: "Time Dilation",
  description:
    "Compare exact Schwarzschild proper-time rates for static and freely orbiting clocks near a compact mass.",
};

export default function TimeDilationPage() {
  return <TimeDilationSimulation />;
}
