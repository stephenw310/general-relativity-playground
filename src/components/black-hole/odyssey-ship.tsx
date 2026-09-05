"use client";

import { useEffect, useMemo } from "react";
import {
  BufferGeometry,
  CanvasTexture,
  CatmullRomCurve3,
  DoubleSide,
  Float32BufferAttribute,
  Shape,
  SRGBColorSpace,
  Vector2,
  Vector3,
} from "three";
import { EngineExhaust } from "@/components/black-hole/engine-exhaust";
import { tidalStrain } from "@/utils/descent-physics";

type Section = [number, number, number]; // z, half-width, half-height
const HULL: Section[] = [
  [-4.25, 0.015, 0.015],
  [-3.85, 0.28, 0.22],
  [-3.2, 0.61, 0.42],
  [-2.2, 0.84, 0.57],
  [-0.8, 0.91, 0.63],
  [0.8, 0.91, 0.61],
  [2.25, 0.83, 0.51],
  [2.8, 0.66, 0.39],
  [2.85, 0.01, 0.01],
];
const POD: Section[] = [
  [-2.1, 0.02, 0.02],
  [-1.75, 0.24, 0.25],
  [-1, 0.44, 0.43],
  [0.5, 0.48, 0.46],
  [1.3, 0.44, 0.42],
  [1.7, 0.31, 0.31],
];

function loft(sections: Section[], start = 0, end = Math.PI * 2, outset = 0) {
  const curve = new CatmullRomCurve3(
    sections.map(([z, x, y]) => new Vector3(x, y, z)),
    false,
    "centripetal",
  );
  const positions: number[] = [],
    uv: number[] = [],
    top: number[] = [],
    bottom: number[] = [];
  const rings = 80,
    sides = 48;
  for (let i = 0; i <= rings; i++) {
    const s = curve.getPoint(i / rings);
    for (let j = 0; j <= sides; j++) {
      const a = start + ((end - start) * j) / sides;
      positions.push(
        Math.cos(a) * (s.x + outset),
        Math.sin(a) * (s.y + outset),
        s.z,
      );
      uv.push(j / sides, i / rings);
    }
  }
  for (let i = 0; i < rings; i++)
    for (let j = 0; j < sides; j++) {
      const a = i * (sides + 1) + j,
        b = a + sides + 1;
      const indices =
        Math.sin(start + ((end - start) * (j + 0.5)) / sides) < -0.3
          ? bottom
          : top;
      indices.push(a, a + 1, b, b, a + 1, b + 1);
    }
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute(positions, 3));
  geometry.setAttribute("uv", new Float32BufferAttribute(uv, 2));
  geometry.setIndex([...top, ...bottom]);
  geometry.addGroup(0, top.length, 0);
  geometry.addGroup(top.length, bottom.length, 1);
  geometry.computeVertexNormals();
  return geometry;
}

function useSkin() {
  const texture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 2048;
    canvas.height = 2048;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.fillStyle = "#d6d8d3";
      ctx.fillRect(0, 0, 2048, 2048);
      ctx.strokeStyle = "#aeb5b3";
      ctx.lineWidth = 1.5;
      for (let y = 180; y < 2048; y += 230) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(2048, y);
        ctx.stroke();
        for (let x = 0; x < 2048; x += 256) {
          const offset = (Math.floor(y / 230) % 2) * 128;
          ctx.beginPath();
          ctx.moveTo(x + offset, y);
          ctx.lineTo(x + offset, y + 230);
          ctx.stroke();
          ctx.fillStyle = "#858f91";
          ctx.fillRect(x + offset + 8, y + 8, 3, 3);
        }
      }
      ctx.fillStyle = "#415366";
      ctx.fillRect(0, 1220, 2048, 32);
      ctx.fillStyle = "#b77644";
      ctx.fillRect(0, 1259, 2048, 8);
      for (const x of [140, 1660]) {
        ctx.save();
        ctx.translate(x, 740);
        ctx.rotate(-Math.PI / 2);
        ctx.fillStyle = "#394854";
        ctx.font = "500 54px sans-serif";
        ctx.fillText("ODYSSEY", 0, 0);
        ctx.font = "22px sans-serif";
        ctx.fillText("07   /   DEEP SPACE", 0, 34);
        ctx.restore();
      }
    }
    const result = new CanvasTexture(canvas);
    result.colorSpace = SRGBColorSpace;
    result.anisotropy = 8;
    return result;
  }, []);
  useEffect(() => () => texture.dispose(), [texture]);
  return texture;
}

function Nozzle({ playing }: { playing: boolean }) {
  const profile = useMemo(
    () =>
      [
        [0.25, 0],
        [0.28, 0.15],
        [0.33, 0.38],
        [0.43, 0.69],
        [0.59, 1.02],
        [0.66, 1.2],
        [0.66, 1.27],
        [0.6, 1.27],
        [0.6, 1.2],
        [0.54, 1.02],
        [0.38, 0.69],
        [0.28, 0.38],
        [0.21, 0.15],
        [0.2, 0],
      ].map(([r, z]) => new Vector2(r, z)),
    [],
  );
  return (
    <group position={[0, 0, 1.45]}>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <latheGeometry args={[profile, 96]} />
        <meshStandardMaterial
          color="#4c535b"
          metalness={0.65}
          roughness={0.5}
          side={DoubleSide}
        />
      </mesh>
      {Array.from({ length: 24 }, (_, i) => {
        const a = (i * Math.PI) / 12;
        return (
          <mesh
            key={a}
            position={[Math.cos(a) * 0.34, Math.sin(a) * 0.34, 0.37]}
            rotation={[0, 0, a]}
          >
            <boxGeometry args={[0.028, 0.038, 0.46]} />
            <meshStandardMaterial
              color="#747b80"
              metalness={0.65}
              roughness={0.52}
            />
          </mesh>
        );
      })}
      <mesh position={[0, 0, 0.025]}>
        <circleGeometry args={[0.205, 48]} />
        <meshBasicMaterial
          color="#94caff"
          toneMapped={false}
          side={DoubleSide}
        />
      </mesh>
      <group position={[0, 0, 1.29]}>
        <EngineExhaust playing={playing} />
      </group>
    </group>
  );
}

function EnginePod({ side, playing }: { side: number; playing: boolean }) {
  const shell = useMemo(() => loft(POD), []);
  useEffect(() => () => shell.dispose(), [shell]);
  return (
    <group position={[side * 1.35, -0.27, 1]}>
      <mesh geometry={shell}>
        <meshStandardMaterial
          attach="material-0"
          color="#8e9ba5"
          metalness={0.42}
          roughness={0.55}
        />
        <meshStandardMaterial
          attach="material-1"
          color="#293843"
          metalness={0.5}
          roughness={0.6}
        />
      </mesh>
      {[-0.4, 0.15, 0.7, 1.1].map((z) => (
        <mesh key={z} position={[0, 0, z]}>
          <torusGeometry args={[z > 1 ? 0.44 : 0.477, 0.015, 8, 64]} />
          <meshStandardMaterial
            color="#334654"
            metalness={0.55}
            roughness={0.55}
          />
        </mesh>
      ))}
      {Array.from({ length: 9 }, (_, i) => -0.3 + i * 0.16).map((z) => (
        <mesh
          key={z}
          position={[side * 0.355, 0.255, z]}
          rotation={[0, 0, -side * 0.7]}
        >
          <boxGeometry args={[0.22, 0.025, 0.075]} />
          <meshStandardMaterial
            color="#172730"
            metalness={0.3}
            roughness={0.7}
          />
        </mesh>
      ))}
      <Nozzle playing={playing} />
    </group>
  );
}

export function OdysseyShip({
  radius,
  playing,
}: {
  radius: number;
  playing: boolean;
}) {
  const skin = useSkin();
  const strain = tidalStrain(radius);
  const geometry = useMemo(() => loft(HULL), []);
  const windshield = useMemo(() => {
    const curve = new CatmullRomCurve3(
      HULL.map(([z, x, y]) => new Vector3(x, y, z)),
      false,
      "centripetal",
    );
    const shape: Section[] = Array.from({ length: 161 }, (_, i) =>
      curve.getPoint(i / 160),
    )
      .filter((p) => p.z >= -3.3 && p.z <= -1.8)
      .map((p) => [p.z, p.x, p.y]);
    return [loft(shape, 0.96, 1.53, 0.018), loft(shape, 1.61, 2.18, 0.018)];
  }, []);
  const strake = useMemo(() => {
    const s = new Shape();
    s.moveTo(0.65, -1.2);
    s.lineTo(1.6, 0.2);
    s.lineTo(2.15, 2.1);
    s.lineTo(1.65, 2.45);
    s.lineTo(0.6, 1.8);
    s.closePath();
    return s;
  }, []);
  useEffect(
    () => () => {
      geometry.dispose();
      for (const pane of windshield) pane.dispose();
    },
    [geometry, windshield],
  );
  return (
    <group scale={[1 - strain * 0.18, 1 - strain * 0.18, 1 + strain * 1.1]}>
      <mesh geometry={geometry}>
        <meshStandardMaterial
          attach="material-0"
          map={skin}
          metalness={0.22}
          roughness={0.58}
        />
        <meshStandardMaterial
          attach="material-1"
          color="#253542"
          metalness={0.4}
          roughness={0.63}
        />
      </mesh>
      {windshield.map((pane) => (
        <mesh key={pane.uuid} geometry={pane}>
          <meshPhysicalMaterial
            color="#0b2333"
            metalness={0.35}
            roughness={0.16}
            clearcoat={1}
            clearcoatRoughness={0.1}
            side={DoubleSide}
          />
        </mesh>
      ))}
      {[-1, 1].map((side) => (
        <group key={side}>
          <group scale={[side, 1, 1]}>
            <mesh position={[0, -0.3, 0]} rotation={[Math.PI / 2, 0, 0]}>
              <extrudeGeometry
                args={[
                  strake,
                  {
                    depth: 0.16,
                    bevelEnabled: true,
                    bevelSize: 0.075,
                    bevelThickness: 0.045,
                    bevelSegments: 3,
                    steps: 1,
                  },
                ]}
              />
              <meshStandardMaterial
                color="#73838f"
                metalness={0.3}
                roughness={0.6}
              />
            </mesh>
            <mesh
              position={[0.87, 0.22, 0.42]}
              scale={[0.13, 0.16, 1.36]}
              rotation={[0, 0, -0.4]}
            >
              <boxGeometry />
              <meshStandardMaterial
                color="#324959"
                metalness={0.45}
                roughness={0.5}
              />
            </mesh>
            {Array.from({ length: 12 }, (_, i) => -0.12 + i * 0.105).map(
              (z) => (
                <mesh key={z} position={[0.902, 0.23, z]}>
                  <boxGeometry args={[0.045, 0.09, 0.042]} />
                  <meshStandardMaterial color="#0d1e29" roughness={0.65} />
                </mesh>
              ),
            )}
            <mesh position={[0.63, 0.1, -2.67]} rotation={[0, Math.PI / 2, 0]}>
              <cylinderGeometry args={[0.085, 0.07, 0.08, 24]} />
              <meshStandardMaterial
                color="#152531"
                metalness={0.35}
                roughness={0.55}
              />
            </mesh>
            <mesh position={[1.97, -0.25, 2.08]}>
              <sphereGeometry args={[0.038, 12, 8]} />
              <meshBasicMaterial color={side > 0 ? "#a4eaff" : "#ff7864"} />
            </mesh>
          </group>
          <EnginePod side={side} playing={playing} />
        </group>
      ))}
      <mesh position={[0, 0.62, 0.7]} scale={[0.3, 0.06, 0.82]}>
        <boxGeometry />
        <meshStandardMaterial color="#263f50" metalness={0.4} roughness={0.6} />
      </mesh>
      {Array.from({ length: 12 }, (_, i) => 0.02 + i * 0.12).map((z) => (
        <mesh key={z} position={[0, 0.656, z]}>
          <boxGeometry args={[0.24, 0.012, 0.026]} />
          <meshStandardMaterial
            color="#79919e"
            metalness={0.45}
            roughness={0.55}
          />
        </mesh>
      ))}
    </group>
  );
}
