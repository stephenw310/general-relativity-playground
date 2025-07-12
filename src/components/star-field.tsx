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
  MathUtils,
  Clock,
} from "three";

const STAR_COUNT = 300000;
const STAR_FIELD_RADIUS = 2000;
const STAR_MIN_DISTANCE = 100;

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

export function StarField() {
  const pointsRef = useRef<Points>(null);
  const materialRef = useRef<ShaderMaterial | null>(null);
  const clockRef = useRef<Clock>(new Clock());
  const { gl } = useThree();

  // Create geometry and material
  const { starGeometry, starMaterial } = useMemo(() => {
    // Geometry creation
    const starGeometry = new BufferGeometry();
    const starPositions = new Float32Array(STAR_COUNT * 3);
    const starColors = new Float32Array(STAR_COUNT * 3);
    const starSizes = new Float32Array(STAR_COUNT);
    const starTwinkle = new Float32Array(STAR_COUNT);

    for (let i = 0; i < STAR_COUNT; i++) {
      const i3 = i * 3;
      const phi = Math.acos(-1 + (2 * i) / STAR_COUNT);
      const theta = Math.sqrt(STAR_COUNT * Math.PI) * phi;
      const radius =
        Math.cbrt(Math.random()) * STAR_FIELD_RADIUS + STAR_MIN_DISTANCE;

      starPositions[i3] = radius * Math.sin(phi) * Math.cos(theta);
      starPositions[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      starPositions[i3 + 2] = radius * Math.cos(phi);

      const starColor =
        starPalette[Math.floor(Math.random() * starPalette.length)].clone();
      starColor.multiplyScalar(Math.random() * 0.7 + 0.3);
      starColors[i3] = starColor.r;
      starColors[i3 + 1] = starColor.g;
      starColors[i3 + 2] = starColor.b;
      starSizes[i] = MathUtils.randFloat(0.6, 3.0);
      starTwinkle[i] = Math.random() * Math.PI * 2;
    }

    starGeometry.setAttribute(
      "position",
      new BufferAttribute(starPositions, 3),
    );
    starGeometry.setAttribute("color", new BufferAttribute(starColors, 3));
    starGeometry.setAttribute("size", new BufferAttribute(starSizes, 1));
    starGeometry.setAttribute("twinkle", new BufferAttribute(starTwinkle, 1));

    // Material creation
    const starMaterial = new ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uPixelRatio: { value: gl.getPixelRatio() },
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
  }, [gl]);

  // Store material ref
  useEffect(() => {
    materialRef.current = starMaterial;
  }, [starMaterial]);

  // Animation loop
  useFrame(() => {
    if (!materialRef.current || !pointsRef.current) return;

    const elapsedTime = clockRef.current.getElapsedTime();
    const deltaTime = clockRef.current.getDelta();

    // Update twinkling animation
    materialRef.current.uniforms.uTime.value = elapsedTime;

    // Rotate star field slowly
    pointsRef.current.rotation.y += deltaTime * 0.003;
    pointsRef.current.rotation.x += deltaTime * 0.001;
  });

  return (
    <points ref={pointsRef}>
      <primitive object={starGeometry} attach="geometry" />
      <primitive object={starMaterial} attach="material" />
    </points>
  );
}
