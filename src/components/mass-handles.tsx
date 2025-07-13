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
  MASS_COLOR_DEFAULT,
  MASS_COLOR_SELECTED,
  MASS_COLOR_HOVERED,
} from "@/constants";
import { getFinalMassScale } from "@/utils/mass-calculations";
import { resolveCollisions } from "@/utils/collision-detection";
import {
  createCosmicTexture,
  getCosmicTypeByMass,
} from "@/utils/cosmic-textures";

// Create reusable objects outside component to avoid memory allocation
const dragPlane = new Plane(new Vector3(0, 1, 0), 0);
const intersection = new Vector3();

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
    return getFinalMassScale(mass.mass, isSelected, isHovered);
  }, [isSelected, isHovered, mass.mass]);

  // Create cosmic texture based on stored cosmic type
  const cosmicTexture = useMemo(() => {
    const type = mass.cosmicType || getCosmicTypeByMass(mass.mass);
    return createCosmicTexture(type);
  }, [mass.cosmicType, mass.mass]);

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
      <meshBasicMaterial map={cosmicTexture} color={color} />
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
