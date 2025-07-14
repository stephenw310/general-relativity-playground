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

// Better hash function for generating seeds from IDs
export function generateSeedFromId(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    const char = id.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

// LRU texture cache with disposal to prevent memory leaks
interface CacheEntry {
  texture: CanvasTexture;
  lastUsed: number;
}

const MAX_CACHE_SIZE = 50;
const textureCache = new Map<string, CacheEntry>();

function evictLeastRecentlyUsed() {
  if (textureCache.size < MAX_CACHE_SIZE) return;

  let oldestKey = "";
  let oldestTime = Date.now();

  for (const [key, entry] of textureCache.entries()) {
    if (entry.lastUsed < oldestTime) {
      oldestTime = entry.lastUsed;
      oldestKey = key;
    }
  }

  if (oldestKey) {
    const entry = textureCache.get(oldestKey);
    if (entry) {
      entry.texture.dispose();
      textureCache.delete(oldestKey);
    }
  }
}

export function createCosmicTexture(
  type: CosmicObjectType,
  size: number = 256,
  seed?: number,
): CanvasTexture {
  const actualType = type === "custom" ? "star" : type;
  const textureSeed = seed ?? Math.random() * 1000;

  // Create cache key with full precision to avoid collisions
  const cacheKey = `${actualType}-${size}-${textureSeed.toFixed(3)}`;

  // Return cached texture if available
  const cacheEntry = textureCache.get(cacheKey);
  if (cacheEntry) {
    cacheEntry.lastUsed = Date.now();
    return cacheEntry.texture;
  }

  // Evict old textures if cache is full
  evictLeastRecentlyUsed();

  let canvas: HTMLCanvasElement;
  let ctx: CanvasRenderingContext2D;

  try {
    canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const context = canvas.getContext("2d");

    if (!context) {
      throw new Error("Failed to get 2D context");
    }

    ctx = context;
  } catch (error) {
    console.error("Failed to create canvas for texture:", error);
    return createFallbackTexture(actualType, size);
  }

  const config = COSMIC_CONFIGS[actualType];

  try {
    // Create realistic procedural texture based on stellar physics
    generateRealisticStellarSurface(ctx, actualType, size, config, textureSeed);
  } catch (error) {
    console.error("Failed to generate stellar surface:", error);
    return createFallbackTexture(actualType, size);
  }

  const texture = new CanvasTexture(canvas);
  texture.needsUpdate = true;

  // Cache the texture for future use
  textureCache.set(cacheKey, {
    texture,
    lastUsed: Date.now(),
  });

  return texture;
}

// Fallback texture for when generation fails
function createFallbackTexture(
  type: CosmicObjectType,
  size: number,
): CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;

  const actualType = type === "custom" ? "star" : type;
  const config = COSMIC_CONFIGS[actualType];
  const baseColorHex = `#${config.baseColor.getHexString()}`;

  // Simple solid color fallback
  ctx.fillStyle = baseColorHex;
  ctx.fillRect(0, 0, size, size);

  const texture = new CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

// Improved seeded noise function for procedural generation
function noise2D(x: number, y: number, seed: number = 0): number {
  // Better pseudo-random noise with multiple frequencies
  const x1 = x + seed;
  const y1 = y + seed;

  const n1 = Math.sin(x1 * 12.9898 + y1 * 78.233) * 43758.5453;
  const n2 = Math.sin(x1 * 17.2895 + y1 * 94.673) * 31648.7521;
  const n3 = Math.sin(x1 * 25.1328 + y1 * 63.429) * 29573.8462;

  const noise = (n1 + n2 * 0.5 + n3 * 0.25) / 1.75;
  return Math.abs(noise - Math.floor(noise));
}

function fbm(x: number, y: number, seed: number, octaves: number = 4): number {
  let value = 0;
  let amplitude = 0.5;
  let frequency = 1;

  for (let i = 0; i < octaves; i++) {
    value += amplitude * noise2D(x * frequency, y * frequency, seed + i);
    amplitude *= 0.5;
    frequency *= 2;
  }

  return value;
}

function generateRealisticStellarSurface(
  ctx: CanvasRenderingContext2D,
  type: CosmicObjectType,
  size: number,
  config: CosmicObjectConfig,
  seed: number,
) {
  const imageData = ctx.createImageData(size, size);
  const data = imageData.data;

  const baseColor = config.baseColor;
  const baseR = Math.floor(baseColor.r * 255);
  const baseG = Math.floor(baseColor.g * 255);
  const baseB = Math.floor(baseColor.b * 255);

  switch (type) {
    case "star":
      generateSolarSurface(data, size, baseR, baseG, baseB, seed);
      break;
    case "pulsar":
      generatePulsarSurface(data, size, baseR, baseG, baseB, seed);
      break;
    case "neutron_star":
      generateNeutronStarSurface(data, size, baseR, baseG, baseB, seed);
      break;
    case "white_dwarf":
      generateWhiteDwarfSurface(data, size, baseR, baseG, baseB, seed);
      break;
    case "red_giant":
      generateRedGiantSurface(data, size, baseR, baseG, baseB, seed);
      break;
  }

  ctx.putImageData(imageData, 0, 0);
}

function generateSolarSurface(
  data: Uint8ClampedArray,
  size: number,
  r: number,
  g: number,
  b: number,
  seed: number,
) {
  // Solar granulation and convection cells
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;

      // Granulation pattern using multiple noise scales
      const granulation = fbm(x / 20, y / 20, seed, 3) * 0.3;
      const convection = fbm(x / 50, y / 50, seed + 100, 2) * 0.2;
      const microStructure = fbm(x / 8, y / 8, seed + 200, 4) * 0.1;

      const intensity = 0.7 + granulation + convection + microStructure;

      data[idx] = Math.min(255, Math.max(0, r * intensity));
      data[idx + 1] = Math.min(255, Math.max(0, g * intensity));
      data[idx + 2] = Math.min(255, Math.max(0, b * intensity));
      data[idx + 3] = 255;
    }
  }
}

function generatePulsarSurface(
  data: Uint8ClampedArray,
  size: number,
  r: number,
  g: number,
  b: number,
  seed: number,
) {
  // Magnetic field patterns and high-energy emissions
  const centerX = size / 2;
  const centerY = size / 2;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;

      // Distance from center
      const dx = x - centerX;
      const dy = y - centerY;
      const dist = Math.sqrt(dx * dx + dy * dy) / (size / 2);
      const angle = Math.atan2(dy, dx);

      // Magnetic field lines (vary with seed)
      const fieldRotation = ((seed % 100) / 100) * Math.PI * 2;
      const magneticField =
        Math.sin((angle + fieldRotation) * 6) * Math.exp(-dist * 2) * 0.4;
      const baseIntensity = 0.6 + magneticField;

      // High-energy hotspots
      const hotspots = fbm(x / 15, y / 15, seed, 3) * 0.3;

      const intensity = baseIntensity + hotspots;

      data[idx] = Math.min(255, Math.max(0, r * intensity));
      data[idx + 1] = Math.min(255, Math.max(0, g * intensity));
      data[idx + 2] = Math.min(255, Math.max(0, b * intensity));
      data[idx + 3] = 255;
    }
  }
}

function generateNeutronStarSurface(
  data: Uint8ClampedArray,
  size: number,
  r: number,
  g: number,
  b: number,
  seed: number,
) {
  // Ultra-dense crystalline surface
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;

      // Crystalline structure (vary orientation with seed)
      const crystalPhase = seed % 100;
      const crystal =
        Math.sin((x + crystalPhase) / 8) *
        Math.sin((y + crystalPhase) / 8) *
        0.2;
      const density = fbm(x / 30, y / 30, seed, 2) * 0.1;

      const intensity = 0.8 + crystal + density;

      data[idx] = Math.min(255, Math.max(0, r * intensity));
      data[idx + 1] = Math.min(255, Math.max(0, g * intensity));
      data[idx + 2] = Math.min(255, Math.max(0, b * intensity));
      data[idx + 3] = 255;
    }
  }
}

function generateWhiteDwarfSurface(
  data: Uint8ClampedArray,
  size: number,
  r: number,
  g: number,
  b: number,
  seed: number,
) {
  // Degenerate matter surface with carbon-oxygen crystallization
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;

      // Carbon-oxygen crystals (vary structure with seed)
      const crystalOffset = seed % 50;
      const crystalline =
        Math.cos((x + crystalOffset) / 12) *
        Math.cos((y + crystalOffset) / 12) *
        0.15;
      const surface = fbm(x / 25, y / 25, seed, 2) * 0.1;

      const intensity = 0.85 + crystalline + surface;

      data[idx] = Math.min(255, Math.max(0, r * intensity));
      data[idx + 1] = Math.min(255, Math.max(0, g * intensity));
      data[idx + 2] = Math.min(255, Math.max(0, b * intensity));
      data[idx + 3] = 255;
    }
  }
}

function generateRedGiantSurface(
  data: Uint8ClampedArray,
  size: number,
  r: number,
  g: number,
  b: number,
  seed: number,
) {
  // Turbulent convection and variable brightness
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;

      // Large-scale convection
      const convection = fbm(x / 40, y / 40, seed, 2) * 0.4;
      const turbulence = fbm(x / 15, y / 15, seed + 100, 4) * 0.2;
      const coolingPhase = seed % 60;
      const cooling =
        Math.sin((x + coolingPhase) / 60) *
        Math.sin((y + coolingPhase) / 60) *
        0.1;

      const intensity = 0.6 + convection + turbulence + cooling;

      data[idx] = Math.min(255, Math.max(0, r * intensity));
      data[idx + 1] = Math.min(255, Math.max(0, g * intensity));
      data[idx + 2] = Math.min(255, Math.max(0, b * intensity));
      data[idx + 3] = 255;
    }
  }
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
