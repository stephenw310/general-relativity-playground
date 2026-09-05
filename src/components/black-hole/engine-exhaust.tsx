"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import { Matrix4, type Mesh, type ShaderMaterial, Vector3 } from "three";

const VERTEX = `
  varying vec3 localPosition;
  void main() {
    localPosition = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;
const FRAGMENT = `
  precision highp float;
  uniform float time;
  uniform vec3 eye;
  varying vec3 localPosition;
  float turbulence(vec3 p) {
    return sin(p.z * 24.0 - time * 17.0 + sin(p.x * 15.0))
      * sin(p.y * 18.0 + p.z * 9.0 - time * 8.0);
  }
  void main() {
    vec3 ray = normalize(localPosition - eye);
    vec3 lo = (vec3(-0.95, -0.95, -2.1) - eye) / ray;
    vec3 hi = (vec3(0.95, 0.95, 2.1) - eye) / ray;
    vec3 entry = min(lo, hi), leave = max(lo, hi);
    float nearT = max(max(entry.x, entry.y), entry.z);
    float farT = min(min(leave.x, leave.y), leave.z);
    nearT = max(nearT, 0.0);
    if (farT <= nearT) discard;
    float stepSize = (farT - nearT) / 48.0;
    vec3 light = vec3(0.0);
    float opacity = 0.0;
    for (int i = 0; i < 48; i++) {
      vec3 p = eye + ray * (nearT + (float(i) + 0.5) * stepSize);
      float t = clamp((p.z + 2.1) / 4.2, 0.0, 1.0);
      float ripple = turbulence(p) * 0.07 * t;
      float width = 0.39 * (1.0 - 0.72 * t) + 0.12 * sin(t * 3.14159);
      float r = length(p.xy + vec2(sin(t*17.0-time*3.0),cos(t*13.0-time*4.0))*0.025*t);
      float edge = 1.0 - smoothstep(width * 0.2, width, r + ripple);
      float taper = pow(1.0 - t, 1.6) * smoothstep(0.0, 0.015, t);
      float cells = 0.75 + 0.25 * pow(cos(t * 24.0), 2.0);
      float core = exp(-r*r / max(0.006, 0.035 * (1.0-t)));
      float density = edge * taper * (0.5 + core * 1.8) * cells;
      vec3 color = mix(vec3(0.12, 0.38, 1.0), vec3(1.0, 0.32, 0.045), smoothstep(0.18, 0.85, t));
      color = mix(color, vec3(0.75, 0.91, 1.0), core * (1.0-t) * 0.85);
      float a = 1.0 - exp(-density * stepSize * 3.4);
      light += (1.0-opacity) * color * a * 1.6;
      opacity += (1.0-opacity) * a;
    }
    if (opacity < 0.004) discard;
    gl_FragColor = vec4(light / max(opacity, 0.001), opacity * 0.92);
  }
`;

export function EngineExhaust({ playing }: { playing: boolean }) {
  const mesh = useRef<Mesh>(null);
  const material = useRef<ShaderMaterial>(null);
  const time = useRef(0);
  const inverse = useMemo(() => new Matrix4(), []);
  const uniforms = useMemo(
    () => ({ time: { value: 0 }, eye: { value: new Vector3() } }),
    [],
  );
  useFrame(({ camera }, delta) => {
    if (playing) time.current += Math.min(delta, 0.1);
    if (!mesh.current || !material.current) return;
    mesh.current.updateWorldMatrix(true, false);
    inverse.copy(mesh.current.matrixWorld).invert();
    material.current.uniforms.eye.value
      .copy(camera.position)
      .applyMatrix4(inverse);
    material.current.uniforms.time.value = time.current;
  });
  return (
    <group>
      <mesh ref={mesh} position={[0, 0, 2.13]} frustumCulled={false}>
        <boxGeometry args={[1.9, 1.9, 4.2]} />
        <shaderMaterial
          ref={material}
          vertexShader={VERTEX}
          fragmentShader={FRAGMENT}
          uniforms={uniforms}
          transparent
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
      <pointLight
        color="#87baff"
        intensity={1.8}
        distance={3.5}
        decay={2}
        position={[0, 0, 0.15]}
      />
    </group>
  );
}
