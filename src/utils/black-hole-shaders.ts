// GLSL for the black hole simulation: accretion disk material and the
// screen-space gravitational lens pass.

// ---------------------------------------------------------------------------
// Accretion disk
// The disk mesh is a unit-factor ring (inner/outer in multiples of rs) scaled
// by rs on the mesh, so these uniforms never change with mass.
// ---------------------------------------------------------------------------

export const diskVertexShader = /* glsl */ `
  varying vec2 vPos;

  void main() {
    vPos = position.xy;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const diskFragmentShader = /* glsl */ `
  uniform float uTime;
  uniform float uInner;
  uniform float uOuter;
  uniform float uSpeed;
  uniform float uCamAzimuth;
  varying vec2 vPos;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
      mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
      u.y
    );
  }

  void main() {
    float r = length(vPos);
    float t = clamp((r - uInner) / (uOuter - uInner), 0.0, 1.0);
    float azimuth = atan(vPos.y, vPos.x);

    // Keplerian differential rotation: inner material orbits faster
    float omega = uSpeed * 0.6 * pow(uInner / max(r, 1e-4), 1.5);
    float a = azimuth - uTime * omega;

    // Sample noise on a circle so there is no seam at azimuth = +/-pi
    vec2 np = vec2(cos(a), sin(a)) * (1.5 + r * 0.9);
    float n = noise(np * 2.0) * 0.6 + noise(np * 4.0 + vec2(7.3, 2.1)) * 0.4;

    // Blackbody-ish temperature gradient, hot inner edge to dim outer rim
    vec3 hot = vec3(1.0, 0.97, 0.9);
    vec3 warm = vec3(1.0, 0.58, 0.22);
    vec3 cool = vec3(0.5, 0.11, 0.04);
    vec3 col = mix(hot, warm, smoothstep(0.0, 0.45, t));
    col = mix(col, cool, smoothstep(0.45, 1.0, t));

    // Doppler beaming: the side rotating toward the camera is brighter
    // and blue-shifted
    float beam = sin(azimuth - uCamAzimuth);
    col *= 1.0 + 0.55 * beam * (1.0 - t * 0.5);
    col = mix(col, col * vec3(0.85, 0.92, 1.3), max(beam, 0.0) * 0.35);

    float intensity = mix(1.7, 0.25, t);
    intensity *= 0.6 + 0.8 * n;

    float alpha = smoothstep(0.0, 0.06, t) * (1.0 - smoothstep(0.7, 1.0, t));
    gl_FragColor = vec4(col * intensity, alpha);
  }
`;

// ---------------------------------------------------------------------------
// Gravitational lens pass
// Thin-lens deflection applied in screen space around the black hole's
// projected position: beta = theta - thetaE^2 / theta. Pixels inside the
// shadow radius map to black. All radii are in aspect-corrected UV units,
// precomputed on the CPU each frame.
// ---------------------------------------------------------------------------

export const lensVertexShader = /* glsl */ `
  varying vec2 vUv;

  void main() {
    vUv = position.xy * 0.5 + 0.5;
    gl_Position = vec4(position.xy, 1.0, 1.0);
  }
`;

export const lensFragmentShader = /* glsl */ `
  uniform sampler2D uScene;
  uniform vec2 uCenter;
  uniform float uThetaE2;
  uniform float uShadowR;
  uniform float uAspect;
  varying vec2 vUv;

  void main() {
    vec2 d = (vUv - uCenter) * vec2(uAspect, 1.0);
    float r = length(d);

    if (r < uShadowR) {
      gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
      return;
    }

    // Deflect the sampling point toward the source position; the factor
    // goes negative inside the Einstein radius, producing the inverted
    // secondary image
    float factor = 1.0 - uThetaE2 / max(r * r, 1e-8);
    vec2 srcUv = uCenter + d * factor / vec2(uAspect, 1.0);
    vec3 col = texture2D(uScene, clamp(srcUv, 0.0, 1.0)).rgb;

    // Subtle brightening where magnification piles star light onto the ring
    float ring = smoothstep(uShadowR, uShadowR * 1.15, r) *
      (1.0 - smoothstep(uShadowR * 1.15, uShadowR * 2.5, r));
    col += col * ring * 0.8;

    gl_FragColor = vec4(col, 1.0);
  }
`;
