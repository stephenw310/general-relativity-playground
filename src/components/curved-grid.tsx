"use client";

import { useRef, useMemo, useEffect, useCallback } from "react";
import { Mesh, ShaderMaterial, Vector3 } from "three";
import { CurvedGridProps } from "@/types";
import {
  GRID_SIZE,
  GRID_RESOLUTION,
  MAX_MASSES_DEFAULT,
  GRID_RESOLUTION_BY_MASS_COUNT,
} from "@/constants";
import {
  generateVertexShader,
  fragmentShader,
} from "@/utils/shader-generation";

export function CurvedGrid({
  masses = [],
  gridSize = GRID_SIZE,
  gridResolution = GRID_RESOLUTION,
}: CurvedGridProps) {
  const meshRef = useRef<Mesh>(null);
  // Use fixed max masses to prevent material recreation
  const maxMasses = MAX_MASSES_DEFAULT;

  // Adaptive grid resolution based on performance needs
  const adaptiveResolution = useMemo(() => {
    const massCount = masses.length;
    if (massCount <= 2)
      return Math.min(gridResolution, GRID_RESOLUTION_BY_MASS_COUNT.low);
    if (massCount <= 4)
      return Math.min(gridResolution, GRID_RESOLUTION_BY_MASS_COUNT.medium);
    return Math.min(gridResolution, GRID_RESOLUTION_BY_MASS_COUNT.high);
  }, [masses.length, gridResolution]);

  const uniforms = useMemo(
    () => ({
      masses: {
        value: new Array(maxMasses).fill(null).map(() => new Vector3(0, 0, 0)),
      },
      massValues: { value: new Array(maxMasses).fill(0) },
      massCount: { value: 0 },
    }),
    [maxMasses],
  );

  const shaderMaterial = useMemo(() => {
    return new ShaderMaterial({
      vertexShader: generateVertexShader(maxMasses),
      fragmentShader,
      uniforms,
      wireframe: false,
    });
  }, [uniforms, maxMasses]);

  // Optimized mass update function
  const updateMassUniforms = useCallback(() => {
    const massPositions = uniforms.masses.value;
    const massValues = uniforms.massValues.value;

    // Clear arrays first
    for (let i = 0; i < maxMasses; i++) {
      massPositions[i].set(0, 0, 0);
      massValues[i] = 0;
    }

    // Populate with current masses
    masses.forEach((mass, index) => {
      if (index < maxMasses) {
        // Local plane Y axis maps to -world Z after the -90° X rotation, so flip sign
        massPositions[index].set(mass.position[0], -mass.position[1], 0);
        massValues[index] = mass.mass;
      }
    });

    const massCount = Math.min(masses.length, maxMasses);
    uniforms.massCount.value = massCount;
  }, [masses, uniforms, maxMasses]);

  // Update uniforms when masses change
  useEffect(() => {
    updateMassUniforms();
  }, [updateMassUniforms]);

  return (
    <mesh ref={meshRef} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry
        args={[gridSize, gridSize, adaptiveResolution, adaptiveResolution]}
      />
      <primitive object={shaderMaterial} attach="material" />
    </mesh>
  );
}
