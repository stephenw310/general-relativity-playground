import type { Metadata } from "next";
import { DescentSimulation } from "@/components/black-hole/descent-simulation";

export const metadata: Metadata = {
  title: "Event Horizon · Cockpit descent",
  description:
    "Take the pilot's seat and follow a slow free fall into a supermassive black hole.",
};

export default function DescentPage() {
  return <DescentSimulation />;
}
