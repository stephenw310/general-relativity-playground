import { CanvasTexture, Color } from "three";

export type CosmicObjectType =
  | "star"
  | "pulsar"
  | "neutron_star"
  | "white_dwarf"
  | "red_giant"
  | "custom";

interface CosmicObjectConfig {
  baseColor: Color;
}

const COSMIC_CONFIGS: Record<
  Exclude<CosmicObjectType, "custom">,
  CosmicObjectConfig
> = {
  star: {
    baseColor: new Color(0xffd700),
  },
  pulsar: {
    baseColor: new Color(0x00ffff),
  },
  neutron_star: {
    baseColor: new Color(0xaaffff),
  },
  white_dwarf: {
    baseColor: new Color(0xffffff),
  },
  red_giant: {
    baseColor: new Color(0xff4444),
  },
};

export const COSMIC_MASS_PRESETS: Record<
  Exclude<CosmicObjectType, "custom">,
  number
> = {
  white_dwarf: 0.6,
  neutron_star: 1.4,
  pulsar: 1.97,
  star: 2.5,
  red_giant: 8.0,
};

export function createCosmicTexture(
  type: CosmicObjectType,
  size: number = 256,
): CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;

  const actualType = type === "custom" ? "star" : type;
  const config = COSMIC_CONFIGS[actualType];
  const baseColorHex = `#${config.baseColor.getHexString()}`;

  ctx.fillStyle = baseColorHex;
  ctx.fillRect(0, 0, size, size);

  const texture = new CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

export function getRandomCosmicType(): CosmicObjectType {
  const types: CosmicObjectType[] = [
    "star",
    "pulsar",
    "neutron_star",
    "white_dwarf",
    "red_giant",
  ];
  return types[Math.floor(Math.random() * types.length)];
}

export function getCosmicTypeByMass(mass: number): CosmicObjectType {
  // Assign cosmic object types based on realistic mass ranges (in solar masses)
  if (mass < 0.8) return "white_dwarf";
  if (mass < 1.4) return "neutron_star";
  if (mass < 2.5) return "pulsar";
  if (mass < 8) return "star";
  return "red_giant";
}
