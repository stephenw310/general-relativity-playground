"use client";

import { ScreenQuad } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo } from "react";
import { ShaderMaterial } from "three";
import {
  lensingFragmentShader,
  lensingVertexShader,
} from "@/utils/lensing-shaders";

interface LensedGalaxyFieldProps {
  einsteinRadius: number;
  sourceX: number;
  sourceY: number;
  sourceSize: number;
  stellarEllipticity: number;
  haloFraction: number;
  externalShear: number;
  showSubstructure: boolean;
  showLensGalaxy: boolean;
  showGuides: boolean;
}

export function LensedGalaxyField({
  einsteinRadius,
  sourceX,
  sourceY,
  sourceSize,
  stellarEllipticity,
  haloFraction,
  externalShear,
  showSubstructure,
  showLensGalaxy,
  showGuides,
}: LensedGalaxyFieldProps) {
  const { size } = useThree();
  const material = useMemo(
    () =>
      new ShaderMaterial({
        uniforms: {
          uAspect: { value: 1 },
          uTime: { value: 0 },
          uEinsteinRadius: { value: 0 },
          uSourceX: { value: 0 },
          uSourceY: { value: 0 },
          uSourceSize: { value: 0 },
          uStellarEllipticity: { value: 0 },
          uHaloFraction: { value: 0 },
          uExternalShear: { value: 0 },
          uShowSubstructure: { value: 0 },
          uShowLensGalaxy: { value: 0 },
          uShowGuides: { value: 0 },
        },
        vertexShader: lensingVertexShader,
        fragmentShader: lensingFragmentShader,
        depthWrite: false,
        depthTest: false,
      }),
    [],
  );

  useEffect(() => {
    return () => material.dispose();
  }, [material]);

  useFrame(({ clock }) => {
    const uniforms = material.uniforms;
    uniforms.uAspect.value = size.width / size.height;
    uniforms.uTime.value = clock.elapsedTime;
    uniforms.uEinsteinRadius.value = einsteinRadius;
    uniforms.uSourceX.value = sourceX;
    uniforms.uSourceY.value = sourceY;
    uniforms.uSourceSize.value = sourceSize;
    uniforms.uStellarEllipticity.value = stellarEllipticity;
    uniforms.uHaloFraction.value = haloFraction;
    uniforms.uExternalShear.value = externalShear;
    uniforms.uShowSubstructure.value = showSubstructure ? 1 : 0;
    uniforms.uShowLensGalaxy.value = showLensGalaxy ? 1 : 0;
    uniforms.uShowGuides.value = showGuides ? 1 : 0;
  });

  return (
    <ScreenQuad renderOrder={-1} frustumCulled={false}>
      <primitive object={material} attach="material" />
    </ScreenQuad>
  );
}
