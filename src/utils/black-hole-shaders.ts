// Backward ray tracer for a non-spinning Schwarzschild black hole. Spatial
// null geodesics are integrated through the exact Schwarzschild optical metric
// in isotropic coordinates. Distances in the shader are normalized by rs.

export const lensVertexShader = /* glsl */ `
  varying vec2 vUv;

  void main() {
    vUv = position.xy * 0.5 + 0.5;
    gl_Position = vec4(position.xy, 1.0, 1.0);
  }
`;

export const lensFragmentShader = /* glsl */ `
  uniform vec3 uCameraPosition;
  uniform vec3 uCameraRight;
  uniform vec3 uCameraUp;
  uniform vec3 uCameraForward;
  uniform float uAspect;
  uniform float uTanHalfFov;
  uniform float uTime;
  uniform float uDiskSpeed;
  uniform float uLensingStrength;
  uniform float uShowDisk;
  uniform float uShowPhotonSphere;
  uniform int uMaxSteps;
  varying vec2 vUv;

  const float PI = 3.14159265359;
  const float HORIZON_RHO = 0.252;
  const float DISK_INNER = 3.0;
  const float DISK_OUTER = 8.0;
  const int MAX_TRACE_STEPS = 192;

  float hash21(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
  }

  float valueNoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(hash21(i), hash21(i + vec2(1.0, 0.0)), f.x),
      mix(hash21(i + vec2(0.0, 1.0)), hash21(i + vec2(1.0)), f.x),
      f.y
    );
  }

  float arealRadius(float rho) {
    float conformal = 1.0 + 0.25 / max(rho, HORIZON_RHO);
    return rho * conformal * conformal;
  }

  vec3 opticalGradient(vec3 p) {
    float rho = max(length(p), HORIZON_RHO);
    float a = 0.25 / rho;
    float radialDerivative = -a / rho *
      (3.0 / (1.0 + a) + 1.0 / max(1.0 - a, 0.002));
    return p / rho * radialDerivative * uLensingStrength;
  }

  vec3 rayAcceleration(vec3 p, vec3 direction) {
    vec3 gradient = opticalGradient(p);
    return gradient - direction * dot(direction, gradient);
  }

  vec3 starLayer(vec2 uv, vec2 grid, float threshold, vec3 tint) {
    vec2 cell = floor(uv * grid);
    vec2 local = fract(uv * grid);
    float seed = hash21(cell);
    vec2 center = vec2(
      hash21(cell + 19.17),
      hash21(cell + 73.91)
    );
    float size = mix(0.025, 0.11, pow(hash21(cell + 7.31), 7.0));
    float point = 1.0 -
      smoothstep(size * 0.28, size, length(local - center));
    float visible = step(threshold, seed);
    float brightness = mix(0.35, 1.8, pow(seed, 7.0));
    return tint * point * visible * brightness;
  }

  vec3 spaceColor(vec3 direction) {
    vec3 d = normalize(direction);
    vec2 uv = vec2(
      atan(d.z, d.x) / (2.0 * PI) + 0.5,
      asin(clamp(d.y, -1.0, 1.0)) / PI + 0.5
    );

    float galacticLatitude = abs(dot(
      d,
      normalize(vec3(-0.22, 0.91, 0.35))
    ));
    float milkyWay = exp(-galacticLatitude * 10.5);
    float cloud = valueNoise(uv * vec2(7.0, 4.0) + 4.7);
    vec3 color = vec3(0.0015, 0.0025, 0.006);
    color += vec3(0.018, 0.025, 0.052) *
      milkyWay * (0.35 + 0.65 * cloud);

    // A fixed distant galaxy gives the changing shadow an angular reference.
    // Because it is sampled by the escaped ray direction, it is lensed by the
    // same geodesic integration as the rest of the celestial background.
    vec3 galaxyCenter = normalize(vec3(-0.12, -0.35, -1.0));
    vec3 galaxyRight = normalize(cross(
      vec3(0.0, 1.0, 0.0),
      galaxyCenter
    ));
    vec3 galaxyUp = normalize(cross(galaxyCenter, galaxyRight));
    float galaxyX = dot(d, galaxyRight) / 0.06;
    float galaxyY = dot(d, galaxyUp) / 0.02;
    float galaxyRadius = length(vec2(galaxyX, galaxyY));
    float galaxyFacing = smoothstep(
      0.94,
      0.995,
      dot(d, galaxyCenter)
    );
    float galaxyAngle = atan(galaxyY, galaxyX);
    float spiral = 0.5 + 0.5 * sin(
      galaxyAngle * 2.0 - galaxyRadius * 6.0
    );
    float galaxyHalo = exp(-galaxyRadius * 1.7) * galaxyFacing;
    float galaxyArms = pow(spiral, 5.0) *
      exp(-galaxyRadius * 1.25) * galaxyFacing;
    float galaxyCore = exp(-galaxyRadius * 8.5) * galaxyFacing;
    float dustLane = smoothstep(
      0.08,
      0.32,
      abs(galaxyY + 0.08 * sin(galaxyX * 3.0))
    );
    color += vec3(0.16, 0.24, 0.42) *
      galaxyHalo * (0.45 + 0.55 * dustLane);
    color += vec3(0.32, 0.48, 0.78) *
      galaxyArms * 0.36;
    color += vec3(0.92, 0.78, 0.58) *
      galaxyCore * 0.82;

    color += starLayer(
      uv,
      vec2(230.0, 115.0),
      0.965,
      vec3(0.72, 0.82, 1.0)
    );
    color += starLayer(
      uv + 0.371,
      vec2(410.0, 205.0),
      0.982,
      vec3(1.0, 0.79, 0.55)
    );
    return color;
  }

  vec3 diskColor(vec3 hitPoint, vec3 rayDirection, float radius) {
    float azimuth = atan(hitPoint.z, hitPoint.x);
    float omega = 0.42 * uDiskSpeed * pow(DISK_INNER / radius, 1.5);
    float advectedAzimuth = azimuth - uTime * omega;

    vec2 flow = vec2(cos(advectedAzimuth), sin(advectedAzimuth));
    float turbulence =
      valueNoise(
        flow * (2.2 + radius * 0.35) + vec2(radius * 0.55, 0.0)
      ) * 0.68 +
      valueNoise(
        flow * (5.0 + radius * 0.45) - vec2(radius * 1.1, 0.0)
      ) * 0.32;

    // A zero-torque thin disk is cool at the ISCO, peaks just outside it,
    // then cools outward: F proportional to r^-3(1-sqrt(r_in/r)).
    float flux = pow(DISK_INNER / radius, 3.0) *
      max(1.0 - sqrt(DISK_INNER / radius), 0.0);
    float temperature = pow(clamp(flux / 0.057, 0.0, 1.0), 0.25);
    // Visible-light interpretation of the thermal spectrum: the hottest
    // material is nearly white with a cool cast, while only the cooler outer
    // disk retains an amber tone. A real stellar-mass disk peaks in X-rays.
    vec3 emitted = mix(
      vec3(0.72, 0.16, 0.025),
      vec3(1.0, 0.64, 0.24),
      smoothstep(0.12, 0.72, temperature)
    );
    emitted = mix(
      emitted,
      vec3(0.9, 0.96, 1.0),
      smoothstep(0.72, 0.98, temperature)
    );

    // Frequency shift for a circular Schwarzschild orbit, measured by the
    // camera-facing photon direction in the local static frame.
    float beta = sqrt(0.5 / max(radius - 1.0, 0.51));
    float gamma = inversesqrt(max(1.0 - beta * beta, 0.1));
    vec3 radial = normalize(vec3(hitPoint.x, 0.0, hitPoint.z));
    vec3 velocityDirection = normalize(
      cross(vec3(0.0, 1.0, 0.0), radial)
    );
    float lineOfSight = dot(
      velocityDirection,
      normalize(-rayDirection)
    );
    float gravitational = sqrt(max(1.0 - 1.0 / radius, 0.01));
    float redshift = gravitational /
      max(gamma * (1.0 - beta * lineOfSight), 0.2);
    redshift = clamp(redshift, 0.42, 1.85);

    vec3 shifted = emitted;
    shifted *= mix(
      vec3(1.08, 0.78, 0.62),
      vec3(0.86, 0.96, 1.08),
      smoothstep(0.68, 1.32, redshift)
    );

    float orbitingKnots = 0.7 + 0.3 * pow(
      0.5 + 0.5 * sin(
        advectedAzimuth * 4.0 + radius * 3.2 + turbulence * 2.4
      ),
      2.0
    );
    float bands = 0.9 +
      0.1 * sin(radius * 10.0 + turbulence * 2.5);
    float outerFade = 1.0 -
      smoothstep(6.7, DISK_OUTER, radius);
    float observedIntensity = pow(redshift, 3.0);
    return shifted * temperature * observedIntensity *
      (0.62 + 0.52 * turbulence) * orbitingKnots *
      bands * outerFade * 1.5;
  }

  void main() {
    vec2 screen = vUv * 2.0 - 1.0;
    screen.x *= uAspect;
    vec3 direction = normalize(
      uCameraForward +
      uCameraRight * screen.x * uTanHalfFov +
      uCameraUp * screen.y * uTanHalfFov
    );
    vec3 position = uCameraPosition;
    float cameraRadius = length(position);
    float cameraArealRadius = arealRadius(cameraRadius);
    float criticalImpact = 2.598076211;
    float criticalSin = criticalImpact *
      sqrt(max(1.0 - 1.0 / cameraArealRadius, 0.0)) /
      cameraArealRadius;
    float raySin = length(cross(
      -normalize(uCameraPosition),
      direction
    ));
    bool insidePhysicalShadow =
      abs(uLensingStrength - 1.0) < 0.001 &&
      raySin <= criticalSin;
    float escapeRadius = max(cameraRadius + 3.0, 24.0);

    bool traceExhausted = true;
    bool hitDisk = false;
    bool escaped = false;
    vec3 result = vec3(0.0);

    for (int i = 0; i < MAX_TRACE_STEPS; i++) {
      if (i >= uMaxSteps) break;

      float rho = length(position);
      if (rho <= HORIZON_RHO) {
        traceExhausted = false;
        break;
      }
      if (rho > escapeRadius && dot(position, direction) > 0.0) {
        traceExhausted = false;
        escaped = true;
        break;
      }

      float stepSize = clamp(
        (rho - HORIZON_RHO) * 0.095,
        0.006,
        4.0
      );
      vec3 acceleration = rayAcceleration(position, direction);
      vec3 midpointDirection = normalize(
        direction + acceleration * stepSize * 0.5
      );
      vec3 midpoint =
        position + midpointDirection * stepSize * 0.5;
      vec3 midpointAcceleration =
        rayAcceleration(midpoint, midpointDirection);
      vec3 nextDirection = normalize(
        direction + midpointAcceleration * stepSize
      );
      vec3 nextPosition =
        position + midpointDirection * stepSize;

      if (
        uShowDisk > 0.5 &&
        position.y * nextPosition.y <= 0.0
      ) {
        float denominator = position.y - nextPosition.y;
        float crossing = position.y /
          (abs(denominator) < 0.000001
            ? 0.000001
            : denominator);
        crossing = clamp(crossing, 0.0, 1.0);
        vec3 hitPoint = mix(position, nextPosition, crossing);
        float diskRadius = arealRadius(length(hitPoint));
        if (
          diskRadius >= DISK_INNER &&
          diskRadius <= DISK_OUTER
        ) {
          result = diskColor(
            hitPoint,
            midpointDirection,
            diskRadius
          );
          traceExhausted = false;
          hitDisk = true;
          break;
        }
      }

      position = nextPosition;
      direction = nextDirection;
    }

    if (!hitDisk) {
      if (escaped && !insidePhysicalShadow) {
        result = spaceColor(direction);
      } else if (traceExhausted || insidePhysicalShadow) {
        // Never sample the celestial background from a ray that has not
        // crossed the escape boundary. Also keep the exact Schwarzschild
        // capture cone dark if numerical stepping crosses its separatrix.
        result = vec3(0.0);
      }
    }

    if (uShowPhotonSphere > 0.5) {
      float guideDistance = abs(raySin - criticalSin);
      float guideHalo = 1.0 - smoothstep(
        0.0015,
        0.007,
        guideDistance
      );
      float guideCore = 1.0 - smoothstep(
        0.0004,
        0.0028,
        guideDistance
      );
      result += vec3(0.32, 0.54, 0.78) * guideHalo * 0.11;
      result = mix(
        result,
        vec3(0.86, 0.95, 1.0),
        guideCore * 0.78
      );
    }

    // Filmic shoulder preserves the hot side of the disk without flat white.
    result = result / (1.0 + result);
    result = pow(max(result, vec3(0.0)), vec3(0.84));
    gl_FragColor = vec4(result, 1.0);
  }
`;
