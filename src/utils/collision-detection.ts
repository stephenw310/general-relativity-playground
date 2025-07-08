import {
  MASS_COLLISION_BUFFER,
  COLLISION_RESOLUTION_ITERATIONS,
} from "@/constants/physics";
import { getActualVisualRadius } from "./mass-calculations";

export interface MassForCollision {
  id: string;
  position: [number, number];
  mass: number;
}

// Collision detection and resolution with dynamic radii
export function resolveCollisions(
  proposedPosition: [number, number],
  currentMassId: string,
  allMasses: MassForCollision[],
): [number, number] {
  let resolvedPosition: [number, number] = [...proposedPosition];

  // Find the current mass to get its mass value
  const currentMass = allMasses.find((m) => m.id === currentMassId);
  if (!currentMass) return resolvedPosition; // Safety check

  const currentRadius = getActualVisualRadius(currentMass.mass);

  // Iterative collision resolution for complex scenarios
  for (
    let iteration = 0;
    iteration < COLLISION_RESOLUTION_ITERATIONS;
    iteration++
  ) {
    let collisionDetected = false;

    for (const otherMass of allMasses) {
      // Skip self
      if (otherMass.id === currentMassId) continue;

      // Calculate distance between positions
      const dx = resolvedPosition[0] - otherMass.position[0];
      const dy = resolvedPosition[1] - otherMass.position[1];
      const distance = Math.sqrt(dx * dx + dy * dy);

      // Calculate dynamic collision distance: sum of both radii plus buffer
      const otherRadius = getActualVisualRadius(otherMass.mass);
      const minCollisionDistance =
        currentRadius + otherRadius + MASS_COLLISION_BUFFER;

      // Check if collision detected
      if (distance < minCollisionDistance) {
        collisionDetected = true;

        // Calculate collision resolution vector
        if (distance > 0) {
          // Normalize the collision vector
          const normalX = dx / distance;
          const normalY = dy / distance;

          // Push away to maintain minimum distance
          const pushDistance = minCollisionDistance - distance;
          resolvedPosition = [
            resolvedPosition[0] + normalX * pushDistance,
            resolvedPosition[1] + normalY * pushDistance,
          ];
        } else {
          // Handle edge case of exact overlap - push in random direction
          const angle = Math.random() * Math.PI * 2;
          resolvedPosition = [
            resolvedPosition[0] + Math.cos(angle) * minCollisionDistance,
            resolvedPosition[1] + Math.sin(angle) * minCollisionDistance,
          ];
        }
      }
    }

    // If no collisions detected in this iteration, we're done
    if (!collisionDetected) break;
  }

  return resolvedPosition;
}
