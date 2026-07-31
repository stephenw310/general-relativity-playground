import type { Metadata } from "next";
import { LensingSimulation } from "@/components/lensing-simulation";

export const metadata: Metadata = {
  title: "Gravitational Lensing",
  description:
    "Shoot light rays through an elliptical galaxy, extended dark-matter halo, tidal shear, and satellite substructure.",
};

export default function LensingPage() {
  return <LensingSimulation />;
}
