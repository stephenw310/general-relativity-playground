"use client";

import { PHOTON_SPHERE_FACTOR } from "@/constants";

interface EventHorizonProps {
  /** Schwarzschild radius in world units */
  rs: number;
  showPhotonSphere: boolean;
}

export function EventHorizon({ rs, showPhotonSphere }: EventHorizonProps) {
  return (
    <group scale={rs}>
      {/* The horizon itself: nothing escapes, so it is simply black */}
      <mesh>
        <sphereGeometry args={[1, 48, 48]} />
        <meshBasicMaterial color="black" />
      </mesh>

      {showPhotonSphere && (
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <torusGeometry args={[PHOTON_SPHERE_FACTOR, 0.015, 8, 128]} />
          <meshBasicMaterial color="#67e8f9" transparent opacity={0.6} />
        </mesh>
      )}
    </group>
  );
}
