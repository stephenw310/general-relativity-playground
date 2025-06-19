"use client";

import { useRef, useState, useCallback, useMemo } from "react";
import { useThree } from "@react-three/fiber";
import { Mesh, Vector3, Plane } from "three";
import {
  useSelectedMassId,
  useUpdateMassPosition,
  useSelectMass,
  useSetIsDragging,
  useMasses,
} from "@/store/store";
import { MassHandleProps, MassHandlesProps } from "@/types";
import {
  DRAG_BOUNDS_MAX,
  MASS_SPHERE_RADIUS,
  MASS_SPHERE_SEGMENTS,
  MASS_Z_POSITION,
  MASS_SCALE_DEFAULT,
  MASS_SCALE_HOVERED,
  MASS_SCALE_SELECTED,
  MASS_SCALE_MIN,
  MASS_SCALE_MAX,
  MASS_MIN_VALUE,
  MASS_MAX_VALUE,
  MASS_COLOR_DEFAULT,
  MASS_COLOR_SELECTED,
  MASS_COLOR_HOVERED,
  EMISSIVE_INTENSITY,
  MASS_COLLISION_BUFFER,
  COLLISION_RESOLUTION_ITERATIONS,
} from "@/constants";

// Create reusable objects outside component to avoid memory allocation
const dragPlane = new Plane(new Vector3(0, 1, 0), 0);
const intersection = new Vector3();

// Calculate mass-proportional base scale
function getMassProportionalScale(massValue: number): number {
  // Normalize mass value from [MASS_MIN_VALUE, MASS_MAX_VALUE] to [0, 1]
  const normalizedMass =
    (massValue - MASS_MIN_VALUE) / (MASS_MAX_VALUE - MASS_MIN_VALUE);
  // Map to scale range [MASS_SCALE_MIN, MASS_SCALE_MAX]
  return MASS_SCALE_MIN + normalizedMass * (MASS_SCALE_MAX - MASS_SCALE_MIN);
}

// Calculate actual visual radius for collision detection based on mass value
function getActualVisualRadius(massValue: number): number {
  const scale = getMassProportionalScale(massValue);
  return MASS_SPHERE_RADIUS * scale;
}

// Collision detection and resolution with dynamic radii
function resolveCollisions(
  proposedPosition: [number, number],
  currentMassId: string,
  allMasses: Array<{ id: string; position: [number, number]; mass: number }>,
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

function MassHandle({ mass }: MassHandleProps) {
  const meshRef = useRef<Mesh>(null);
  const { camera, gl, raycaster, pointer } = useThree();
  const selectedMassId = useSelectedMassId();
  const updateMassPosition = useUpdateMassPosition();
  const selectMass = useSelectMass();
  const setIsDragging = useSetIsDragging();
  const allMasses = useMasses(); // Get all masses for collision detection

  const [isHovered, setIsHovered] = useState(false);
  const isDragging = useRef(false);

  // Cache expensive DOM calculations
  const cachedRect = useRef<DOMRect | null>(null);
  const dragPosition = useRef<[number, number]>(mass.position);
  const updateThrottle = useRef<number | null>(null);

  // Memoized event handlers to prevent recreation
  const handlePointerDown = useCallback(
    (event: React.PointerEvent) => {
      event.stopPropagation();
      isDragging.current = true;
      setIsDragging(true);
      selectMass(mass.id);
      gl.domElement.style.cursor = "grabbing";

      // Align drag plane with the sphere height (Y) to keep motion strictly in-plane
      dragPlane.constant = -MASS_Z_POSITION;

      // Cache rect on drag start to avoid expensive recalculations
      cachedRect.current = gl.domElement.getBoundingClientRect();
      dragPosition.current = [...mass.position];

      // Capture pointer for proper drag handling
      (event.target as HTMLElement).setPointerCapture(event.pointerId);
    },
    [mass.id, gl.domElement, setIsDragging, selectMass, mass.position],
  );

  const handlePointerMove = useCallback(
    (event: React.PointerEvent) => {
      if (!isDragging.current || !cachedRect.current) return;

      // Use cached rect instead of expensive getBoundingClientRect()
      const rect = cachedRect.current;
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      // Cast ray and find intersection with horizontal plane
      raycaster.setFromCamera(pointer, camera);
      if (raycaster.ray.intersectPlane(dragPlane, intersection)) {
        // Define boundaries that match the grid size
        let newPosition: [number, number] = [
          Math.max(-DRAG_BOUNDS_MAX, Math.min(DRAG_BOUNDS_MAX, intersection.x)),
          Math.max(-DRAG_BOUNDS_MAX, Math.min(DRAG_BOUNDS_MAX, intersection.z)),
        ];

        // Apply collision detection and resolution
        newPosition = resolveCollisions(newPosition, mass.id, allMasses);

        // Update ref position immediately for smooth dragging
        dragPosition.current = newPosition;

        // Throttle state updates using requestAnimationFrame
        if (updateThrottle.current === null) {
          updateThrottle.current = requestAnimationFrame(() => {
            if (isDragging.current) {
              updateMassPosition(mass.id, dragPosition.current);
            }
            updateThrottle.current = null;
          });
        }
      }
    },
    [mass.id, pointer, raycaster, camera, updateMassPosition, allMasses],
  );

  const handlePointerUp = useCallback(
    (event: React.PointerEvent) => {
      isDragging.current = false;
      setIsDragging(false);
      selectMass(null);
      gl.domElement.style.cursor = "auto";

      // Clear any pending throttled updates
      if (updateThrottle.current !== null) {
        cancelAnimationFrame(updateThrottle.current);
        updateThrottle.current = null;
      }

      // Ensure final position is committed to state
      updateMassPosition(mass.id, dragPosition.current);

      // Clear cached rect
      cachedRect.current = null;

      // Release pointer capture
      (event.target as HTMLElement).releasePointerCapture(event.pointerId);
    },
    [gl.domElement, setIsDragging, selectMass, mass.id, updateMassPosition],
  );

  const handlePointerEnter = useCallback(() => {
    setIsHovered(true);
    gl.domElement.style.cursor = "pointer";
  }, [gl.domElement]);

  const handlePointerLeave = useCallback(() => {
    setIsHovered(false);
    gl.domElement.style.cursor = "auto";
  }, [gl.domElement]);

  const handleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
  }, []);

  // Memoized computed values to prevent unnecessary recalculations
  const isSelected = selectedMassId === mass.id;
  const scale = useMemo(() => {
    // Get base scale proportional to mass value
    const massProportionalScale = getMassProportionalScale(mass.mass);

    // Apply interactive scaling modifiers on top of mass-proportional scale
    if (isSelected) return massProportionalScale * MASS_SCALE_SELECTED;
    if (isHovered) return massProportionalScale * MASS_SCALE_HOVERED;
    return massProportionalScale * MASS_SCALE_DEFAULT;
  }, [isSelected, isHovered, mass.mass]);

  const color = useMemo(() => {
    if (isSelected) return MASS_COLOR_SELECTED;
    if (isHovered) return MASS_COLOR_HOVERED;
    return MASS_COLOR_DEFAULT;
  }, [isSelected, isHovered]);

  // Map 2-D logical position (x, z) to world-space XZ, keeping constant Y height
  const position = useMemo(
    () => [mass.position[0], MASS_Z_POSITION, mass.position[1]] as const,
    [mass.position],
  );
  const scaleArray = useMemo(() => [scale, scale, scale] as const, [scale]);

  return (
    <mesh
      ref={meshRef}
      position={position}
      scale={scaleArray}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
      onClick={handleClick}
    >
      <sphereGeometry
        args={[MASS_SPHERE_RADIUS, MASS_SPHERE_SEGMENTS, MASS_SPHERE_SEGMENTS]}
      />
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={EMISSIVE_INTENSITY}
      />
    </mesh>
  );
}

export function MassHandles({ masses }: MassHandlesProps) {
  return (
    <>
      {masses.map((mass) => (
        <MassHandle key={mass.id} mass={mass} />
      ))}
    </>
  );
}
