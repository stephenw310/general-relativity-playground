"use client";

import { useMemo, useEffect } from "react";
import { createPortal, useFrame, useThree } from "@react-three/fiber";
import { useFBO, ScreenQuad } from "@react-three/drei";
import { Scene, ShaderMaterial, Vector3 } from "three";
import { StarField } from "@/components/star-field";
import { SHADOW_FACTOR } from "@/constants";
import {
  lensVertexShader,
  lensFragmentShader,
} from "@/utils/black-hole-shaders";

interface LensedStarFieldProps {
  /** Schwarzschild radius in world units */
  rs: number;
  lensingStrength: number;
  starCount?: number;
}

const bhWorldPos = new Vector3();

export function LensedStarField({
  rs,
  lensingStrength,
  starCount,
}: LensedStarFieldProps) {
  const starScene = useMemo(() => new Scene(), []);
  const fbo = useFBO();
  const { size } = useThree();

  const lensMaterial = useMemo(
    () =>
      new ShaderMaterial({
        uniforms: {
          uScene: { value: null },
          uCenter: { value: [0.5, 0.5] },
          uThetaE2: { value: 0 },
          uShadowR: { value: 0 },
          uAspect: { value: 1 },
        },
        vertexShader: lensVertexShader,
        fragmentShader: lensFragmentShader,
        depthWrite: false,
        depthTest: false,
      }),
    [],
  );

  useEffect(() => {
    return () => lensMaterial.dispose();
  }, [lensMaterial]);

  useFrame((state) => {
    const { gl, camera } = state;

    // Render the star scene to the offscreen target with the main camera
    gl.setRenderTarget(fbo);
    gl.clear();
    gl.render(starScene, camera);
    gl.setRenderTarget(null);

    // Project the black hole (world origin) into screen UV space
    bhWorldPos.set(0, 0, 0).project(camera);
    const behind = bhWorldPos.z > 1;
    const cx = bhWorldPos.x * 0.5 + 0.5;
    const cy = bhWorldPos.y * 0.5 + 0.5;

    // Angular radii (radians, small-angle) converted to aspect-corrected UV
    // units: uvPerRadian maps view angle to vertical screen fraction
    const dist = camera.position.length();
    const fovRad =
      ("fov" in camera ? (camera.fov as number) : 60) * (Math.PI / 180);
    const uvPerRadian = 1 / (2 * Math.tan(fovRad / 2));

    const thetaE = Math.sqrt((2 * rs) / Math.max(dist, rs)) * lensingStrength;
    // Shadow shrinks toward the bare horizon as lensing strength drops
    const shadowFactor = 1 + (SHADOW_FACTOR - 1) * Math.min(lensingStrength, 1);
    const thetaShadow = (shadowFactor * rs) / Math.max(dist, rs);

    const uniforms = lensMaterial.uniforms;
    uniforms.uScene.value = fbo.texture;
    uniforms.uCenter.value = [cx, cy];
    uniforms.uAspect.value = size.width / size.height;
    uniforms.uThetaE2.value = behind ? 0 : (thetaE * uvPerRadian) ** 2;
    uniforms.uShadowR.value = behind ? 0 : thetaShadow * uvPerRadian;
  });

  return (
    <>
      {createPortal(<StarField count={starCount} />, starScene)}
      <ScreenQuad renderOrder={-1} frustumCulled={false}>
        <primitive object={lensMaterial} attach="material" />
      </ScreenQuad>
    </>
  );
}
