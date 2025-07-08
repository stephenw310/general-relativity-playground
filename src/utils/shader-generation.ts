import { G, C } from "@/constants/physics";

// Cache for generated vertex shaders
const shaderCache = new Map<number, string>();

// Generate optimized vertex shader based on mass count
export function generateVertexShader(maxMasses: number): string {
  // Check cache first
  if (shaderCache.has(maxMasses)) {
    return shaderCache.get(maxMasses)!;
  }

  const shader = `
  uniform vec3 masses[${maxMasses}];
  uniform float massValues[${maxMasses}];
  uniform int massCount;
  
  varying vec3 vPosition;
  varying float vHeight;
  
  float calculateWarp(vec2 pos) {
    float totalWarp = 0.0;
    
    // Optimized loop - only iterate over actual masses
    for(int i = 0; i < ${maxMasses}; i++) {
      if(i >= massCount) break;
      
      vec2 massPos = masses[i].xy;
      float mass = massValues[i];
      
      vec2 diff = pos - massPos;
      float r = length(diff);
      
      // Avoid singularity at r=0 with small cutoff
      r = max(r, 0.1);
      
      // True Schwarzschild formula: h = rs/r where rs = 2GM/c²
      float schwarzschildRadius = 2.0 * ${G.toFixed(1)} * mass / (${C.toFixed(1)} * ${C.toFixed(1)});
      totalWarp += schwarzschildRadius / r;
    }
    
    return -totalWarp;
  }
  
  void main() {
    vec3 pos = position;
    
    // Calculate warp height based on masses
    float height = calculateWarp(pos.xy);
    pos.z = height;
    
    vPosition = pos;
    vHeight = height;
    
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

  // Cache the generated shader
  shaderCache.set(maxMasses, shader);
  return shader;
}

export const fragmentShader = `
  varying vec3 vPosition;
  varying float vHeight;
  
  void main() {
    // Create grid lines
    vec2 grid = abs(fract(vPosition.xy * 2.0) - 0.5) / fwidth(vPosition.xy * 2.0);
    float line = min(grid.x, grid.y);
    
    // Color based on height (depth)
    vec3 color = mix(
      vec3(0.2, 0.5, 1.0), // Blue for deep warps
      vec3(1.0, 1.0, 1.0), // White for flat areas
      clamp(vHeight + 0.5, 0.0, 1.0)
    );
    
    // Apply grid lines
    color = mix(color, vec3(0.8, 0.8, 0.8), 1.0 - min(line, 1.0));
    
    gl_FragColor = vec4(color, 1.0);
  }
`;
