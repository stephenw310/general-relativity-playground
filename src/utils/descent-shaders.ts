import { lensFragmentShader } from "./black-hole-shaders";
import { PLANET_DIRECTION } from "./descent-physics";

// Share the procedural sky and disk. The orbit viewer's isotropic optical
// metric cannot cross the horizon, so this camera uses ingoing
// Painleve-Gullstrand coordinates instead. The camera follows their freely
// falling orthonormal frame. For a future-directed photon with spatial
// covector p, dx/dt = p/|p| - sqrt(1/r) rHat and
// dp/dt = sqrt(1/r)/r [p - 3/2 (p.rHat)rHat]. Integrate backward to the source.
// Colors and exposure are illustrative; there is no radiation transport.
export const descentFragmentShader = `${lensFragmentShader.slice(0, lensFragmentShader.indexOf("  void main()"))}
  uniform sampler2D uSkyMap;
  uniform float uHasSkyMap;
  vec3 panoramaSky(vec3 d) {
    if (uHasSkyMap < 0.5) return spaceColor(d);
    // Rotate the photographic sphere as a whole. These axes are orthonormal.
    vec3 north = normalize(vec3(0.32, 0.88, -0.35));
    vec3 east = normalize(cross(north, vec3(0.0, 0.0, -1.0)));
    vec3 center = cross(east, north);
    vec2 uv = vec2(atan(dot(d, east), dot(d, center)) / 6.28318530718 + 0.5,
                   asin(clamp(dot(d, north), -1.0, 1.0)) / 3.14159265359 + 0.5);
    // Rays escape on different loop iterations, so implicit texture
    // derivatives are undefined here. An explicit mip level avoids streaks.
    return textureLod(uSkyMap, uv, 0.7).rgb * 1.8;
  }
  vec3 referenceSky(vec3 direction) {
    vec3 d = normalize(direction);
    vec3 center = normalize(vec3(${PLANET_DIRECTION.join(", ")}));
    vec3 right = normalize(cross(vec3(0.0, 1.0, 0.0), center));
    vec3 up = normalize(cross(center, right));
    // An enlarged distant reference globe, not a planet orbiting in the disk.
    vec2 q = vec2(dot(d, right), dot(d, up)) / 0.22;
    float r = length(q);
    vec3 background = panoramaSky(d);
    if (dot(d, center) < 0.8) return background;
    float atmosphere = exp(-abs(r - 1.0) * 34.0);
    background += vec3(0.08, 0.4, 0.85) * atmosphere * 0.5;
    if (r >= 1.0) return background;
    vec3 n = vec3(q, sqrt(max(0.0, 1.0 - r * r)));
    float longitude = atan(n.x, n.z) + 0.001 * uTime;
    float latitude = asin(n.y);
    vec2 map = vec2(longitude * 2.5, latitude * 3.0);
    float continents = valueNoise(map + 3.4) * 0.60 + valueNoise(map * 2.2) * 0.27 + valueNoise(map * 5.4) * 0.13;
    float land = smoothstep(0.49, 0.54, continents);
    vec3 ocean = mix(vec3(0.008, 0.055, 0.15), vec3(0.02, 0.34, 0.54), smoothstep(0.38, 0.5, continents));
    vec3 ground = mix(vec3(0.06, 0.19, 0.10), vec3(0.53, 0.48, 0.25), smoothstep(0.52, 0.7, continents));
    vec3 surface = mix(ocean, ground, land);
    float clouds = valueNoise(map * 4.0 + vec2(0.0, sin(longitude * 3.0))) * 0.65 + valueNoise(map * 9.0) * 0.35;
    surface = mix(surface, vec3(0.88, 0.95, 1.0), smoothstep(0.57, 0.72, clouds) * 0.87);
    surface = mix(surface, vec3(0.86, 0.93, 1.0), smoothstep(0.87, 0.98, abs(n.y)));
    float light = max(dot(n, normalize(vec3(-0.55, 0.5, 0.85))), 0.0);
    surface *= 0.10 + 1.5 * light;
    surface += vec3(0.08, 0.33, 0.64) * pow(1.0 - n.z, 3.0) * (0.3 + light);
    return mix(surface, background, smoothstep(0.994, 1.0, r));
  }
  vec3 flow(vec3 x) {
    float r = max(length(x), 0.00001);
    return x / r * inversesqrt(r);
  }
  vec3 momentumRate(vec3 x, vec3 p) {
    float r = max(length(x), 0.00001);
    vec3 n = x / r;
    return (p - 1.5 * dot(p, n) * n) / pow(r, 1.5);
  }
  void main() {
    vec2 screen = vUv * 2.0 - 1.0;
    screen.x *= uAspect;
    vec3 view = normalize(uCameraForward + uCameraRight * screen.x * uTanHalfFov + uCameraUp * screen.y * uTanHalfFov);
    vec3 x = uCameraPosition;
    vec3 p = -view;
    vec3 color = vec3(0.0004, 0.0007, 0.0015);
    float escapeRadius = 32.0;
    for (int i = 0; i < 520; i++) {
      float r = length(x);
      if (r > escapeRadius) {
        color = referenceSky(-normalize(p));
        break;
      }
      if (r < 0.00002 || length(p) > 200000.0) break;
      float h = -clamp(r * 0.06 / (1.0 + inversesqrt(r)), 0.00000005, 1.0);
      vec3 dx = normalize(p) - flow(x);
      vec3 dp = momentumRate(x, p);
      vec3 xm = x + dx * h * 0.5;
      vec3 pm = p + dp * h * 0.5;
      vec3 nextX = x + (normalize(pm) - flow(xm)) * h;
      vec3 nextP = p + momentumRate(xm, pm) * h;
      if (uShowDisk > 0.5 && x.y * nextX.y < 0.0) {
        vec3 hit = mix(x, nextX, x.y / (x.y - nextX.y));
        float diskR = length(hit);
        if (diskR >= 3.0 && diskR <= 8.0) {
          color = diskColor(hit, -normalize(pm), diskR);
          // Warm visible-color interpretation of the emitting disk.
          color *= vec3(1.5, 0.93, 0.53);
          break;
        }
      }
      x = nextX;
      p = nextP;
    }
    color = color / (1.0 + color);
    color = pow(max(color, vec3(0.0)), vec3(0.78));
    gl_FragColor = vec4(color, 1.0);
  }
`;
