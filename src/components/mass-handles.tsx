"use client";

import { memo, useRef, useState, useCallback, useMemo } from "react";
import { useThree } from "@react-three/fiber";
import { AdditiveBlending, BackSide, Plane, Vector3 } from "three";
import {
  useStore,
  useSelectedMassId,
  useUpdateMassPosition,
  useSelectMass,
  useSetIsDragging,
} from "@/store/store";
import type { MassHandleProps, MassHandlesProps } from "@/types";
import {
  DRAG_BOUNDS_MAX,
  MASS_SPHERE_RADIUS,
  MASS_SPHERE_SEGMENTS,
  MASS_REFERENCE_PLANE_HEIGHT,
} from "@/constants";
import { getFinalMassScale } from "@/utils/mass-calculations";
import { resolveCollisions } from "@/utils/collision-detection";
import {
  COSMIC_GLOW_COLORS,
  createCosmicTexture,
  getCosmicTypeByMass,
  generateSeedFromId,
} from "@/utils/cosmic-textures";

// Create reusable objects outside component to avoid memory allocation
const dragPlane = new Plane(new Vector3(0, 1, 0), 0);
const intersection = new Vector3();

const MassHandle = memo(function MassHandle({ mass }: MassHandleProps) {
  const { camera, gl, raycaster, pointer } = useThree();
  const selectedMassId = useSelectedMassId();
  const updateMassPosition = useUpdateMassPosition();
  const selectMass = useSelectMass();
  const setIsDragging = useSetIsDragging();

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

      // Object markers all live on the same undeformed reference plane.
      dragPlane.constant = -MASS_REFERENCE_PLANE_HEIGHT;

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

        // Apply collision detection and resolution; read peers transiently so
        // dragging one handle doesn't subscribe every handle to the store
        newPosition = resolveCollisions(
          newPosition,
          mass.id,
          useStore.getState().masses,
        );

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
    [mass.id, pointer, raycaster, camera, updateMassPosition],
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
    return getFinalMassScale(mass.mass, isSelected, isHovered);
  }, [isSelected, isHovered, mass.mass]);
  const cosmicType = mass.cosmicType || getCosmicTypeByMass(mass.mass);

  // Create cosmic texture based on stored cosmic type
  const cosmicTexture = useMemo(() => {
    // Use better hash function for consistent textures per object
    const seed = generateSeedFromId(mass.id);
    return createCosmicTexture(cosmicType, 256, seed);
  }, [cosmicType, mass.id]);

  const glowColor = COSMIC_GLOW_COLORS[cosmicType];

  // Markers show the source locations; their height does not encode mass or
  // curvature. Only the surface shader represents the field response.
  const position = useMemo(
    () =>
      [
        mass.position[0],
        MASS_REFERENCE_PLANE_HEIGHT,
        mass.position[1],
      ] as const,
    [mass.position],
  );

  const scaleArray = useMemo(() => [scale, scale, scale] as const, [scale]);
  const glowScale = scale * (isSelected ? 1.36 : isHovered ? 1.33 : 1.3);

  return (
    <group position={position}>
      <mesh scale={[glowScale, glowScale, glowScale]} raycast={() => undefined}>
        <sphereGeometry args={[MASS_SPHERE_RADIUS, 24, 24]} />
        <meshBasicMaterial
          color={glowColor}
          transparent
          opacity={isSelected ? 0.14 : isHovered ? 0.1 : 0.08}
          blending={AdditiveBlending}
          depthWrite={false}
          side={BackSide}
        />
      </mesh>

      <mesh
        scale={scaleArray}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerEnter={handlePointerEnter}
        onPointerLeave={handlePointerLeave}
        onClick={handleClick}
      >
        <sphereGeometry
          args={[
            MASS_SPHERE_RADIUS,
            MASS_SPHERE_SEGMENTS,
            MASS_SPHERE_SEGMENTS,
          ]}
        />
        <meshBasicMaterial map={cosmicTexture} color="white" />
      </mesh>

      <mesh
        position={[0, 0.025, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        raycast={() => undefined}
      >
        <ringGeometry args={[scale * 1.18, scale * 1.24, 64]} />
        <meshBasicMaterial
          color={glowColor}
          transparent
          opacity={isSelected ? 0.65 : isHovered ? 0.38 : 0.24}
          blending={AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
});

export function MassHandles({ masses }: MassHandlesProps) {
  return (
    <>
      {masses.map((mass) => (
        <MassHandle key={mass.id} mass={mass} />
      ))}
    </>
  );
}
