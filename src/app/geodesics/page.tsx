import type { Metadata } from "next";
import { GeodesicsSimulation } from "@/components/geodesics-simulation";

export const metadata: Metadata = {
  title: "Geodesics",
  description:
    "Ray-trace null and timelike Schwarzschild geodesics, from photon capture to relativistic periapsis precession.",
};

export default function GeodesicsPage() {
  return <GeodesicsSimulation />;
}
