"use client";

import { useRef, useMemo, useEffect, useCallback } from "react";
import { useFrame } from "@react-three/fiber";
import { Mesh, ShaderMaterial, Vector3 } from "three";
import { CurvedGridProps } from "@/types";
import {
  GRID_SIZE,
  GRID_RESOLUTION,
  WARP_STRENGTH_DEFAULT,
  MAX_MASSES_DEFAULT,
  MAX_MASSES_MIN,
  WARP_EPSILON,
  GRID_RESOLUTION_BY_MASS_COUNT,
} from "@/constants";

// Generate optimized vertex shader based on mass count
const generateVertexShader = (maxMasses: number) => `
  uniform vec3 masses[${maxMasses}];
  uniform float massValues[${maxMasses}];
  uniform int massCount;
  uniform float warpStrength;
  
  varying vec3 vPosition;
  varying float vHeight;
  
  float calculateWarp(vec2 pos) {
    float totalWarp = 0.0;
    
    // Optimized loop - only iterate over actual masses
    for(int i = 0; i < ${maxMasses}; i++) {
      if(i >= massCount) break;
      
      vec2 massPos = masses[i].xy;
      float mass = massValues[i];
      
      vec2 diff = pos - massPos;
      float r = length(diff);
      float epsilon = ${WARP_EPSILON};
      
      // Pseudo-Newtonian: h(r) ≈ k·m / (r² + ε)
      totalWarp += (warpStrength * mass) / (r * r + epsilon);
    }
    
    return -totalWarp;
  }
  
  void main() {
    vec3 pos = position;
    
    // Calculate warp height based on masses
    float height = calculateWarp(pos.xy);
    pos.z = height;
    
    vPosition = pos;
    vHeight = height;
    
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

const fragmentShader = `
  varying vec3 vPosition;
  varying float vHeight;
  
  void main() {
    // Create grid lines
    vec2 grid = abs(fract(vPosition.xy * 2.0) - 0.5) / fwidth(vPosition.xy * 2.0);
    float line = min(grid.x, grid.y);
    
    // Color based on height (depth)
    vec3 color = mix(
      vec3(0.2, 0.5, 1.0), // Blue for deep warps
      vec3(1.0, 1.0, 1.0), // White for flat areas
      clamp(vHeight + 0.5, 0.0, 1.0)
    );
    
    // Apply grid lines
    color = mix(color, vec3(0.8, 0.8, 0.8), 1.0 - min(line, 1.0));
    
    gl_FragColor = vec4(color, 1.0);
  }
`;

export function CurvedGrid({
  masses = [],
  gridSize = GRID_SIZE,
  gridResolution = GRID_RESOLUTION,
  warpStrength = WARP_STRENGTH_DEFAULT,
}: CurvedGridProps) {
  const meshRef = useRef<Mesh>(null);
  const maxMasses = Math.min(
    Math.max(masses.length, MAX_MASSES_MIN),
    MAX_MASSES_DEFAULT,
  );

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
      masses: { value: new Array(maxMasses).fill(new Vector3(0, 0, 0)) },
      massValues: { value: new Array(maxMasses).fill(0) },
      massCount: { value: 0 },
      warpStrength: { value: warpStrength },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [maxMasses], // warpStrength is updated separately via useEffect for performance
  );

  const shaderMaterial = useMemo(() => {
    return new ShaderMaterial({
      vertexShader: generateVertexShader(maxMasses),
      fragmentShader,
      uniforms,
      wireframe: false,
    });
  }, [uniforms, maxMasses]);

  // Update warp strength when it changes
  useEffect(() => {
    uniforms.warpStrength.value = warpStrength;
  }, [warpStrength, uniforms]);

  // Create a change detection hash for better performance
  const massesHash = useMemo(() => {
    return masses
      .map(
        (m) =>
          `${m.id}:${m.position[0].toFixed(3)}:${m.position[1].toFixed(3)}:${m.mass.toFixed(2)}`,
      )
      .join("|");
  }, [masses]);

  const previousHashRef = useRef<string>("");

  // Optimized mass update function
  const updateMassUniforms = useCallback(() => {
    const massPositions = uniforms.masses.value;
    const massValues = uniforms.massValues.value;

    // Clear arrays first
    for (let i = 0; i < maxMasses; i++) {
      massPositions[i].set(0, 0, 0);
      massValues[i] = 0;
    }

    masses.forEach((mass, index) => {
      if (index < maxMasses) {
        // Local plane Y axis maps to -world Z after the -90° X rotation, so flip sign
        massPositions[index].set(mass.position[0], -mass.position[1], 0);
        massValues[index] = mass.mass;
      }
    });

    uniforms.massCount.value = Math.min(masses.length, maxMasses);
    previousHashRef.current = massesHash;
  }, [masses, uniforms, maxMasses, massesHash]);

  // Only update when hash actually changes
  useFrame(() => {
    if (massesHash !== previousHashRef.current) {
      updateMassUniforms();
    }
  });

  return (
    <mesh ref={meshRef} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry
        args={[gridSize, gridSize, adaptiveResolution, adaptiveResolution]}
      />
      <primitive object={shaderMaterial} attach="material" />
    </mesh>
  );
}
