export type SimulationStatus = "available" | "coming-soon";

export interface SimulationMeta {
  id: string;
  title: string;
  description: string;
  route: string;
  status: SimulationStatus;
  thumbnail?: string;
  /** Tailwind gradient classes for the card art when no thumbnail exists */
  gradient: string;
}

export const SIMULATIONS: SimulationMeta[] = [
  {
    id: "spacetime",
    title: "Spacetime Curvature",
    description:
      "Drop masses on a rubber sheet and watch spacetime curve in real-time.",
    route: "/spacetime",
    status: "available",
    thumbnail: "/spacetime-preview-v3.jpg",
    gradient: "from-indigo-950 via-violet-900/60 to-black",
  },
  {
    id: "lensing",
    title: "Gravitational Lensing",
    description:
      "See how massive objects bend light and create Einstein rings.",
    route: "/lensing",
    status: "coming-soon",
    gradient: "from-amber-950 via-orange-900/50 to-black",
  },
  {
    id: "time-dilation",
    title: "Time Dilation",
    description:
      "Watch time slow down near massive objects and speed up in empty space.",
    route: "/time-dilation",
    status: "coming-soon",
    gradient: "from-cyan-950 via-teal-900/50 to-black",
  },
  {
    id: "geodesics",
    title: "Geodesics",
    description:
      "Follow the paths of particles and light through curved spacetime.",
    route: "/geodesics",
    status: "coming-soon",
    gradient: "from-emerald-950 via-green-900/50 to-black",
  },
  {
    id: "black-hole",
    title: "Black Holes",
    description:
      "Journey to the event horizon and explore extreme spacetime curvature.",
    route: "/black-hole",
    status: "available",
    thumbnail: "/black-hole-preview.jpg",
    gradient: "from-slate-950 via-purple-950/60 to-black",
  },
  {
    id: "waves",
    title: "Gravitational Waves",
    description:
      "Visualize ripples in spacetime created by accelerating masses.",
    route: "/gravitational-waves",
    status: "coming-soon",
    gradient: "from-rose-950 via-pink-900/50 to-black",
  },
];
