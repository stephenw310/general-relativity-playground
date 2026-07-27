"use client";

import { useRef, useMemo, useEffect } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import {
  Points,
  BufferGeometry,
  ShaderMaterial,
  BufferAttribute,
  AdditiveBlending,
  Color,
} from "three";
import {
  STAR_COUNT_DESKTOP,
  STAR_COUNT_MOBILE,
  STAR_FIELD_RADIUS,
  STAR_MIN_DISTANCE,
  STAR_MAX_PIXEL_RATIO,
  STAR_ROTATION_SPEED_Y,
  STAR_ROTATION_SPEED_X,
} from "@/constants";
import { isCoarsePointer } from "@/utils/device";

const STAR_SEED = 0x5eed;

const starPalette = [
  new Color(0x88aaff),
  new Color(0xffaaff),
  new Color(0xaaffff),
  new Color(0xffddaa),
  new Color(0xffeecc),
  new Color(0xffffff),
  new Color(0xff8888),
  new Color(0x88ff88),
  new Color(0xffff88),
  new Color(0x88ffff),
];

// Deterministic PRNG (mulberry32) so geometry generation stays pure and the
// sky is identical across mounts.
function mulberry32(seed: number): () => number {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function getDefaultStarCount(): number {
  return isCoarsePointer() ? STAR_COUNT_MOBILE : STAR_COUNT_DESKTOP;
}

interface StarFieldProps {
  count?: number;
}

export function StarField({ count }: StarFieldProps) {
  const pointsRef = useRef<Points>(null);
  const { gl } = useThree();

  const starCount = count ?? getDefaultStarCount();

  const { starGeometry, starMaterial } = useMemo(() => {
    const random = mulberry32(STAR_SEED);

    const starGeometry = new BufferGeometry();
    const starPositions = new Float32Array(starCount * 3);
    const starColors = new Float32Array(starCount * 3);
    const starSizes = new Float32Array(starCount);
    const starTwinkle = new Float32Array(starCount);

    for (let i = 0; i < starCount; i++) {
      const i3 = i * 3;
      // Uniform sampling on the sphere; cbrt biases radius toward the shell
      const phi = Math.acos(2 * random() - 1);
      const theta = 2 * Math.PI * random();
      const radius =
        Math.cbrt(random()) * STAR_FIELD_RADIUS + STAR_MIN_DISTANCE;

      starPositions[i3] = radius * Math.sin(phi) * Math.cos(theta);
      starPositions[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      starPositions[i3 + 2] = radius * Math.cos(phi);

      const starColor =
        starPalette[Math.floor(random() * starPalette.length)].clone();
      starColor.multiplyScalar(random() * 0.7 + 0.3);
      starColors[i3] = starColor.r;
      starColors[i3 + 1] = starColor.g;
      starColors[i3 + 2] = starColor.b;
      starSizes[i] = 0.6 + random() * 2.4;
      starTwinkle[i] = random() * Math.PI * 2;
    }

    starGeometry.setAttribute(
      "position",
      new BufferAttribute(starPositions, 3),
    );
    starGeometry.setAttribute("color", new BufferAttribute(starColors, 3));
    starGeometry.setAttribute("size", new BufferAttribute(starSizes, 1));
    starGeometry.setAttribute("twinkle", new BufferAttribute(starTwinkle, 1));

    const starMaterial = new ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uPixelRatio: {
          value: Math.min(gl.getPixelRatio(), STAR_MAX_PIXEL_RATIO),
        },
      },
      vertexShader: `
        uniform float uTime;
        uniform float uPixelRatio;
        attribute float size;
        attribute float twinkle;
        varying vec3 vColor;
        varying float vTwinkle;

        void main() {
          vColor = color;
          vTwinkle = sin(uTime * 2.5 + twinkle) * 0.5 + 0.5;

          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size * uPixelRatio * (300.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        varying float vTwinkle;

        void main() {
          float dist = distance(gl_PointCoord, vec2(0.5));
          if (dist > 0.5) discard;

          float alpha = 1.0 - smoothstep(0.0, 0.5, dist);
          alpha *= (0.2 + vTwinkle * 0.8);

          gl_FragColor = vec4(vColor, alpha);
        }
      `,
      transparent: true,
      vertexColors: true,
      blending: AdditiveBlending,
      depthWrite: false,
    });

    return { starGeometry, starMaterial };
  }, [gl, starCount]);

  // Free GPU buffers when the scene unmounts or the geometry is rebuilt
  useEffect(() => {
    return () => {
      starGeometry.dispose();
      starMaterial.dispose();
    };
  }, [starGeometry, starMaterial]);

  useFrame((state, delta) => {
    if (!pointsRef.current) return;

    starMaterial.uniforms.uTime.value = state.clock.elapsedTime;

    pointsRef.current.rotation.y += delta * STAR_ROTATION_SPEED_Y;
    pointsRef.current.rotation.x += delta * STAR_ROTATION_SPEED_X;
  });

  return (
    <points ref={pointsRef}>
      <primitive object={starGeometry} attach="geometry" />
      <primitive object={starMaterial} attach="material" />
    </points>
  );
}
