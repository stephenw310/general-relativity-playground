import { CanvasTexture, SRGBColorSpace } from "three";

export type CosmicObjectType =
  | "star"
  | "pulsar"
  | "neutron_star"
  | "white_dwarf"
  | "red_giant"
  | "custom";

interface RGBColor {
  r: number;
  g: number;
  b: number;
}

interface CosmicObjectConfig {
  shadowColor: RGBColor;
  baseColor: RGBColor;
  highlightColor: RGBColor;
}

function rgb(hex: number): RGBColor {
  return {
    r: (hex >> 16) & 255,
    g: (hex >> 8) & 255,
    b: hex & 255,
  };
}

const COSMIC_CONFIGS: Record<
  Exclude<CosmicObjectType, "custom">,
  CosmicObjectConfig
> = {
  star: {
    shadowColor: rgb(0x8297bc),
    baseColor: rgb(0xd7e5ff),
    highlightColor: rgb(0xffffff),
  },
  pulsar: {
    shadowColor: rgb(0x52658d),
    baseColor: rgb(0xa9c3ef),
    highlightColor: rgb(0xf8fbff),
  },
  neutron_star: {
    shadowColor: rgb(0x687895),
    baseColor: rgb(0xbccde9),
    highlightColor: rgb(0xf7fbff),
  },
  white_dwarf: {
    shadowColor: rgb(0x96aac4),
    baseColor: rgb(0xe5effc),
    highlightColor: rgb(0xffffff),
  },
  red_giant: {
    shadowColor: rgb(0x743726),
    baseColor: rgb(0xdb714a),
    highlightColor: rgb(0xffb47b),
  },
};

export const COSMIC_GLOW_COLORS: Record<CosmicObjectType, string> = {
  star: "#d7e5ff",
  pulsar: "#a9c3ef",
  neutron_star: "#c8d9f2",
  white_dwarf: "#edf5ff",
  red_giant: "#f08a60",
  custom: "#dfe9ff",
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
const TEXTURE_PALETTE_VERSION = 2;
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
  const cacheKey = `${TEXTURE_PALETTE_VERSION}-${actualType}-${size}-${textureSeed.toFixed(3)}`;

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
  texture.colorSpace = SRGBColorSpace;
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
  const ctx = canvas.getContext("2d");

  // This is already the failure path; if even the fallback context is
  // unavailable, hand back the blank canvas rather than throwing
  if (ctx) {
    const actualType = type === "custom" ? "star" : type;
    const config = COSMIC_CONFIGS[actualType];

    ctx.fillStyle = `rgb(${config.baseColor.r} ${config.baseColor.g} ${config.baseColor.b})`;
    ctx.fillRect(0, 0, size, size);
  }

  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
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

  switch (type) {
    case "star":
      generateSolarSurface(data, size, config, seed);
      break;
    case "pulsar":
      generatePulsarSurface(data, size, config, seed);
      break;
    case "neutron_star":
      generateNeutronStarSurface(data, size, config, seed);
      break;
    case "white_dwarf":
      generateWhiteDwarfSurface(data, size, config, seed);
      break;
    case "red_giant":
      generateRedGiantSurface(data, size, config, seed);
      break;
  }

  ctx.putImageData(imageData, 0, 0);
}

function writeStellarPixel(
  data: Uint8ClampedArray,
  index: number,
  config: CosmicObjectConfig,
  intensity: number,
) {
  const belowBase = intensity <= 1;
  const from = belowBase ? config.shadowColor : config.baseColor;
  const to = belowBase ? config.baseColor : config.highlightColor;
  const blend = belowBase
    ? Math.min(1, Math.max(0, (intensity - 0.45) / 0.55))
    : Math.min(1, (intensity - 1) / 0.3);

  data[index] = Math.round(from.r + (to.r - from.r) * blend);
  data[index + 1] = Math.round(from.g + (to.g - from.g) * blend);
  data[index + 2] = Math.round(from.b + (to.b - from.b) * blend);
  data[index + 3] = 255;
}

function generateSolarSurface(
  data: Uint8ClampedArray,
  size: number,
  config: CosmicObjectConfig,
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
      writeStellarPixel(data, idx, config, intensity);
    }
  }
}

function generatePulsarSurface(
  data: Uint8ClampedArray,
  size: number,
  config: CosmicObjectConfig,
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
      writeStellarPixel(data, idx, config, intensity);
    }
  }
}

function generateNeutronStarSurface(
  data: Uint8ClampedArray,
  size: number,
  config: CosmicObjectConfig,
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
      writeStellarPixel(data, idx, config, intensity);
    }
  }
}

function generateWhiteDwarfSurface(
  data: Uint8ClampedArray,
  size: number,
  config: CosmicObjectConfig,
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
      writeStellarPixel(data, idx, config, intensity);
    }
  }
}

function generateRedGiantSurface(
  data: Uint8ClampedArray,
  size: number,
  config: CosmicObjectConfig,
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
      writeStellarPixel(data, idx, config, intensity);
    }
  }
}

export function getCosmicTypeByMass(mass: number): CosmicObjectType {
  // Assign cosmic object types based on realistic mass ranges (in solar masses)
  if (mass < 0.8) return "white_dwarf";
  if (mass < 1.4) return "neutron_star";
  if (mass < 2.5) return "pulsar";
  if (mass < 8) return "star";
  return "red_giant";
}
