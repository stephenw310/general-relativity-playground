import Link from "next/link";
import Image from "next/image";
import type { SimulationMeta } from "@/constants/simulations";

type SimulationCardProps = Omit<SimulationMeta, "id">;

export function SimulationCard({
  title,
  description,
  route,
  status,
  thumbnail,
  gradient,
}: SimulationCardProps) {
  const isAvailable = status === "available";

  const cardContent = (
    <div className="group overflow-hidden rounded-xl border border-gray-600 bg-gray-900 transition-all duration-300 hover:border-blue-500 hover:shadow-xl">
      {/* Thumbnail / gradient art */}
      <div className="relative aspect-video overflow-hidden">
        {thumbnail ? (
          <Image
            src={thumbnail}
            alt={`${title} preview`}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div
            className={`h-full w-full bg-gradient-to-br ${gradient}`}
            aria-hidden
          >
            {/* faint grid pattern to echo the spacetime theme */}
            <div className="h-full w-full bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:24px_24px]" />
          </div>
        )}
        {!isAvailable && (
          <span className="absolute top-3 right-3 rounded-full bg-black/60 px-3 py-1 font-medium text-gray-200 text-xs backdrop-blur-sm">
            Coming Soon
          </span>
        )}
      </div>

      {/* Content */}
      <div className="p-6">
        <h3 className="mb-2 font-semibold text-white">{title}</h3>
        <p className="mb-4 text-gray-300 text-sm">{description}</p>

        {isAvailable ? (
          <span className="inline-flex h-9 w-full cursor-pointer items-center justify-center rounded-md bg-blue-600 px-4 py-2 font-medium text-sm text-white transition-colors group-hover:bg-blue-700">
            <span className="mr-2">▶</span>
            Launch Simulation
          </span>
        ) : (
          <span className="inline-flex h-9 w-full cursor-not-allowed items-center justify-center rounded-md bg-gray-700 px-4 py-2 font-medium text-gray-400 text-sm">
            Coming Soon
          </span>
        )}
      </div>
    </div>
  );

  return isAvailable ? (
    <Link href={route} className="block">
      {cardContent}
    </Link>
  ) : (
    cardContent
  );
}
