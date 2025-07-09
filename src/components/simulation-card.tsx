"use client";

import Link from "next/link";

interface SimulationCardProps {
  title: string;
  description: string;
  route: string;
  status: "available" | "coming-soon";
  thumbnail?: string;
}

export function SimulationCard({
  title,
  description,
  route,
  status,
  thumbnail,
}: SimulationCardProps) {
  const isAvailable = status === "available";

  const CardContent = () => (
    <div className="group overflow-hidden rounded-xl border border-gray-600 bg-gray-900 transition-all duration-300 hover:border-blue-500 hover:shadow-xl">
      {/* Thumbnail/Preview Area */}
      <div className="relative overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={thumbnail ?? "/placeholder.jpg"}
          alt={`${title} preview`}
          className="h-48 w-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
      </div>

      {/* Content */}
      <div className="p-6">
        <h3 className="mb-2 font-semibold text-white">{title}</h3>
        <p className="mb-4 text-sm text-gray-300">{description}</p>

        {/* Launch Button */}
        {isAvailable ? (
          <button className="inline-flex h-9 w-full cursor-pointer items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700">
            <span className="mr-2">▶</span>
            Launch Simulation
          </button>
        ) : (
          <button className="inline-flex h-9 w-full cursor-not-allowed items-center justify-center rounded-md bg-gray-700 px-4 py-2 text-sm font-medium text-gray-400">
            Coming Soon
          </button>
        )}
      </div>
    </div>
  );

  return isAvailable ? (
    <Link href={route} className="block">
      <CardContent />
    </Link>
  ) : (
    <CardContent />
  );
}
