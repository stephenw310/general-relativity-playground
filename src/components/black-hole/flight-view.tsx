"use client";

import { ScreenQuad } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useState } from "react";
import {
  ClampToEdgeWrapping,
  NoColorSpace,
  PerspectiveCamera,
  Quaternion,
  RepeatWrapping,
  ShaderMaterial,
  type Texture,
  TextureLoader,
  Vector3,
} from "three";
import { lensVertexShader } from "@/utils/black-hole-shaders";
import { descentFragmentShader } from "@/utils/descent-shaders";
import { FLIGHT_INCLINATION } from "@/utils/descent-physics";

// One decoded panorama shared by both renderers. Each WebGL context uploads
// its own GPU texture. A failed download leaves the procedural sky available.
let panorama: Promise<Texture> | undefined;
function loadPanorama() {
  panorama ??= new TextureLoader()
    .loadAsync("/textures/milky-way-eso.jpg")
    .then((texture) => {
      texture.wrapS = RepeatWrapping;
      texture.wrapT = ClampToEdgeWrapping;
      // The custom shader applies its own illustrative exposure and display curve.
      texture.colorSpace = NoColorSpace;
      return texture;
    })
    .catch((error) => {
      panorama = undefined;
      throw error;
    });
  return panorama;
}
function useMilkyWay() {
  const [texture, setTexture] = useState<Texture | null>(null);
  useEffect(() => {
    let active = true;
    loadPanorama()
      .then((value) => {
        if (active) setTexture(value);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);
  return texture;
}

export function FlightView({
  radius,
  time,
  yaw = 0,
  pitch = 0,
  sceneCamera = false,
  disk,
}: {
  radius: number;
  time: number;
  yaw?: number;
  pitch?: number;
  sceneCamera?: boolean;
  disk: boolean;
}) {
  const { size, camera } = useThree();
  const sky = useMilkyWay();
  const tilt = useMemo(
    () =>
      new Quaternion().setFromAxisAngle(
        new Vector3(1, 0, 0),
        -FLIGHT_INCLINATION,
      ),
    [],
  );
  const material = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: lensVertexShader,
        fragmentShader: descentFragmentShader,
        depthTest: false,
        depthWrite: false,
        uniforms: {
          uSkyMap: { value: null },
          uHasSkyMap: { value: 0 },
          uCameraPosition: { value: new Vector3() },
          uCameraForward: { value: new Vector3() },
          uCameraRight: { value: new Vector3() },
          uCameraUp: { value: new Vector3() },
          uAspect: { value: 1 },
          uTanHalfFov: { value: Math.tan((75 * Math.PI) / 360) },
          uTime: { value: 0 },
          uDiskSpeed: { value: 0.3 },
          uShowDisk: { value: 1 },
        },
      }),
    [],
  );
  useEffect(() => () => material.dispose(), [material]);
  useFrame(() => {
    const u = material.uniforms;
    u.uCameraPosition.value.set(
      0,
      radius * Math.sin(FLIGHT_INCLINATION),
      radius * Math.cos(FLIGHT_INCLINATION),
    );
    // Rotate within the ship's frame, so looking behind reverses the full
    // forward direction, including the inclination above the accretion disk.
    const sinInclination = Math.sin(FLIGHT_INCLINATION);
    const cosInclination = Math.cos(FLIGHT_INCLINATION);
    u.uCameraForward.value.set(
      Math.sin(yaw) * Math.cos(pitch),
      cosInclination * Math.sin(pitch) -
        sinInclination * Math.cos(yaw) * Math.cos(pitch),
      -sinInclination * Math.sin(pitch) -
        cosInclination * Math.cos(yaw) * Math.cos(pitch),
    );
    u.uCameraRight.value.set(
      Math.cos(yaw),
      sinInclination * Math.sin(yaw),
      cosInclination * Math.sin(yaw),
    );
    u.uCameraUp.value
      .crossVectors(u.uCameraRight.value, u.uCameraForward.value)
      .normalize();
    if (sceneCamera) {
      camera.getWorldDirection(u.uCameraForward.value).applyQuaternion(tilt);
      u.uCameraRight.value
        .set(1, 0, 0)
        .applyQuaternion(camera.quaternion)
        .applyQuaternion(tilt);
      u.uCameraUp.value
        .set(0, 1, 0)
        .applyQuaternion(camera.quaternion)
        .applyQuaternion(tilt);
    }
    u.uTanHalfFov.value = Math.tan(
      ((sceneCamera && camera instanceof PerspectiveCamera ? camera.fov : 75) *
        Math.PI) /
        360,
    );
    u.uSkyMap.value = sky;
    u.uHasSkyMap.value = sky ? 1 : 0;
    u.uAspect.value = size.width / size.height;
    u.uTime.value = time;
    u.uShowDisk.value = disk ? 1 : 0;
  });
  return (
    <ScreenQuad renderOrder={-1000}>
      <primitive object={material} attach="material" />
    </ScreenQuad>
  );
}
