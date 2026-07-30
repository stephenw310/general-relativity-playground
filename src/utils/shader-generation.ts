import {
  C,
  G,
  SPACETIME_SOFTENING_RADIUS,
  SPACETIME_VERTICAL_EXAGGERATION,
} from "@/constants/physics";

// Cache for generated vertex shaders
const shaderCache = new Map<number, string>();

// Generate optimized vertex shader based on mass count
export function generateVertexShader(maxMasses: number): string {
  // Check cache first
  const cached = shaderCache.get(maxMasses);
  if (cached !== undefined) {
    return cached;
  }

  const shader = `
  uniform vec3 masses[${maxMasses}];
  uniform float massValues[${maxMasses}];
  uniform int massCount;
  
  varying vec3 vPosition;
  varying float vFieldDepth;
  
  float calculateWeakFieldWarp(vec2 pos) {
    float totalPerturbation = 0.0;
    
    // In the weak-field limit, 2GM/(c²r) is the dimensionless first-order
    // Schwarzschild metric perturbation. These terms can be added as a
    // visualization for multiple separated masses; this is not an exact
    // nonlinear multi-body Schwarzschild solution.
    for(int i = 0; i < ${maxMasses}; i++) {
      if(i >= massCount) break;
      
      vec2 massPos = masses[i].xy;
      float mass = massValues[i];
      
      vec2 diff = pos - massPos;
      float softenedDistance = sqrt(
        dot(diff, diff) +
        ${SPACETIME_SOFTENING_RADIUS.toFixed(2)} *
        ${SPACETIME_SOFTENING_RADIUS.toFixed(2)}
      );
      float metricPerturbation =
        (2.0 * ${G.toFixed(1)} * mass) /
        (${C.toFixed(1)} * ${C.toFixed(1)} * softenedDistance);
      totalPerturbation += metricPerturbation;
    }
    
    return -${SPACETIME_VERTICAL_EXAGGERATION.toFixed(2)} * totalPerturbation;
  }
  
  void main() {
    vec3 pos = position;
    
    // Calculate warp height based on masses
    float height = calculateWeakFieldWarp(pos.xy);
    pos.z = height;
    
    vPosition = pos;
    vFieldDepth = clamp(-height, 0.0, 1.8);
    
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

  // Cache the generated shader
  shaderCache.set(maxMasses, shader);
  return shader;
}

export const fragmentShader = `
  uniform float uTime;
  uniform float gridHalfExtent;

  varying vec3 vPosition;
  varying float vFieldDepth;

  float gridLine(vec2 position, float scale, float width) {
    vec2 coord = position * scale;
    vec2 derivative = fwidth(coord);
    vec2 distanceToLine = abs(fract(coord - 0.5) - 0.5) / derivative;
    float line = min(distanceToLine.x, distanceToLine.y);
    return 1.0 - min(line / width, 1.0);
  }
  
  void main() {
    float fineGrid = gridLine(vPosition.xy, 1.0, 0.8);
    float majorGrid = gridLine(vPosition.xy, 0.2, 1.15);
    float depth = smoothstep(0.0, 1.25, vFieldDepth);

    vec3 flatField = vec3(0.01, 0.018, 0.045);
    vec3 curvedField = vec3(0.04, 0.06, 0.14);
    vec3 deepField = vec3(0.09, 0.10, 0.22);
    vec3 color = mix(flatField, curvedField, smoothstep(0.0, 0.45, depth));
    color = mix(color, deepField, smoothstep(0.38, 1.0, depth));

    vec3 fineColor = mix(
      vec3(0.18, 0.28, 0.54),
      vec3(0.40, 0.46, 0.74),
      depth
    );
    vec3 majorColor = mix(
      vec3(0.48, 0.60, 0.92),
      vec3(0.62, 0.68, 0.96),
      depth
    );

    color = mix(color, fineColor, fineGrid * (0.45 + depth * 0.22));
    color = mix(color, majorColor, majorGrid * (0.62 + depth * 0.22));

    // Quiet animated contour lines make changes in depth easier to read.
    float contourPhase = vFieldDepth * 7.5 - uTime * 0.055;
    float contour = 1.0 - smoothstep(
      0.045,
      0.12,
      abs(fract(contourPhase) - 0.5)
    );
    color += vec3(0.16, 0.24, 0.56) * contour * depth * 0.14;

    float edge = max(abs(vPosition.x), abs(vPosition.y));
    float edgeFade = 1.0 - smoothstep(
      gridHalfExtent * 0.82,
      gridHalfExtent,
      edge
    );
    color *= 0.24 + edgeFade * 0.76;

    // A soft energy bloom around the deepest wells.
    color += vec3(0.07, 0.08, 0.19) * pow(depth, 2.0) * 0.58;

    gl_FragColor = vec4(color, 1.0);
  }
`;
