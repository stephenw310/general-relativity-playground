export const lensingVertexShader = /* glsl */ `
  varying vec2 vUv;

  void main() {
    vUv = position.xy * 0.5 + 0.5;
    gl_Position = vec4(position.xy, 1.0, 1.0);
  }
`;

export const lensingFragmentShader = /* glsl */ `
  uniform float uAspect;
  uniform float uTime;
  uniform float uEinsteinRadius;
  uniform float uSourceX;
  uniform float uSourceY;
  uniform float uSourceSize;
  uniform float uStellarEllipticity;
  uniform float uHaloFraction;
  uniform float uExternalShear;
  uniform float uShowSubstructure;
  uniform float uShowLensGalaxy;
  uniform float uShowGuides;
  varying vec2 vUv;

  const float PI = 3.14159265359;
  const float LENS_ANGLE = 0.27;
  const float SHEAR_ANGLE = -0.48;
  const vec2 SUBHALO_POSITION = vec2(0.62, -0.46);

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

  mat2 rotate2d(float angle) {
    float c = cos(angle);
    float s = sin(angle);
    return mat2(c, -s, s, c);
  }

  float stellarRadius(vec2 imagePosition) {
    float axisRatio = clamp(1.0 - uStellarEllipticity, 0.48, 1.0);
    vec2 p = rotate2d(LENS_ANGLE) * imagePosition;
    return sqrt(
      axisRatio * p.x * p.x +
      p.y * p.y / axisRatio +
      0.0025
    );
  }

  // A softened pseudo-elliptical isothermal stellar potential. Its gradient
  // bends more strongly along the compact axis of the visible galaxy.
  vec2 stellarDeflection(vec2 imagePosition) {
    float axisRatio = clamp(1.0 - uStellarEllipticity, 0.48, 1.0);
    vec2 p = rotate2d(LENS_ANGLE) * imagePosition;
    float radius = stellarRadius(imagePosition);
    vec2 localDeflection = vec2(
      axisRatio * p.x,
      p.y / axisRatio
    ) / radius;
    return rotate2d(-LENS_ANGLE) * localDeflection;
  }

  // Extended NFW-like dark-matter halo. The enclosed-mass profile produces a
  // finite central deflection and a slowly declining outer field.
  vec2 haloDeflection(vec2 imagePosition) {
    const float scaleRadius = 0.62;
    float radius = max(length(imagePosition), 0.0001);
    float enclosedMass =
      log(1.0 + radius / scaleRadius) -
      radius / (radius + scaleRadius);
    float massAtEinsteinRadius =
      log(1.0 + 1.0 / scaleRadius) -
      1.0 / (1.0 + scaleRadius);
    return imagePosition *
      enclosedMass /
      max(massAtEinsteinRadius * radius * radius, 0.00001);
  }

  // Nearby large-scale structure stretches the mapping without adding a
  // luminous object to the frame.
  vec2 shearDeflection(vec2 imagePosition) {
    float c = cos(2.0 * SHEAR_ANGLE);
    float s = sin(2.0 * SHEAR_ANGLE);
    return uExternalShear * vec2(
      c * imagePosition.x + s * imagePosition.y,
      s * imagePosition.x - c * imagePosition.y
    );
  }

  // A small satellite halo perturbs nearby arcs and the critical curve.
  vec2 subhaloDeflection(vec2 imagePosition) {
    vec2 delta = imagePosition - SUBHALO_POSITION;
    return uShowSubstructure *
      0.014 * delta /
      (dot(delta, delta) + 0.012);
  }

  vec2 totalDeflection(vec2 imagePosition) {
    float stellarFraction = 1.0 - uHaloFraction;
    return
      stellarFraction * stellarDeflection(imagePosition) +
      uHaloFraction * haloDeflection(imagePosition) +
      shearDeflection(imagePosition) +
      subhaloDeflection(imagePosition);
  }

  // Backward ray shooting: an observed image-plane coordinate is mapped to the
  // source plane after the extended mass field deflects it.
  vec2 lensMap(vec2 imagePosition) {
    return imagePosition - totalDeflection(imagePosition);
  }

  // The determinant of the lens mapping vanishes on critical curves. We
  // estimate the local derivatives numerically from neighboring rays.
  float jacobianDeterminant(vec2 imagePosition) {
    const float epsilon = 0.0035;
    vec2 dx = vec2(epsilon, 0.0);
    vec2 dy = vec2(0.0, epsilon);
    vec2 derivativeX =
      (lensMap(imagePosition + dx) - lensMap(imagePosition - dx)) /
      (2.0 * epsilon);
    vec2 derivativeY =
      (lensMap(imagePosition + dy) - lensMap(imagePosition - dy)) /
      (2.0 * epsilon);
    return derivativeX.x * derivativeY.y -
      derivativeX.y * derivativeY.x;
  }

  vec3 stars(vec2 sourcePlane) {
    vec2 gridPosition = sourcePlane * 46.0 + vec2(17.3, 9.7);
    vec2 cell = floor(gridPosition);
    vec2 local = fract(gridPosition);
    vec3 color = vec3(0.0);

    for (int y = -1; y <= 1; y++) {
      for (int x = -1; x <= 1; x++) {
        vec2 offset = vec2(float(x), float(y));
        vec2 starCell = cell + offset;
        float seed = hash21(starCell);
        vec2 center = vec2(
          hash21(starCell + 11.7),
          hash21(starCell + 47.2)
        );
        float distanceToStar = length(offset + center - local);
        float size = mix(0.022, 0.075, pow(seed, 8.0));
        float point = 1.0 - smoothstep(size * 0.25, size, distanceToStar);
        float visible = step(0.935, seed);
        vec3 tint = mix(
          vec3(0.48, 0.69, 1.0),
          vec3(1.0, 0.73, 0.48),
          hash21(starCell + 82.1)
        );
        color += tint * point * visible * mix(0.35, 1.8, pow(seed, 6.0));
      }
    }

    return color;
  }

  vec3 sourceGalaxy(vec2 sourcePosition) {
    vec2 p = rotate2d(-0.38) * sourcePosition / uSourceSize;
    p.y /= 0.67;
    float radius = length(p);
    float angle = atan(p.y, p.x);
    float envelope = exp(-pow(radius, 0.72) * 2.05);
    float outerFade = 1.0 - smoothstep(3.2, 4.8, radius);
    float spiralPhase = angle * 2.0 - radius * 5.8;
    float arms = pow(0.5 + 0.5 * cos(spiralPhase), 7.0);
    float secondaryArms = pow(
      0.5 + 0.5 * cos(spiralPhase + sin(radius * 3.0) * 0.8),
      15.0
    );
    float clumps = valueNoise(
      vec2(angle / (2.0 * PI) * 18.0, radius * 5.0) +
      vec2(uTime * 0.018, 3.1)
    );
    float dust = smoothstep(
      0.17,
      0.52,
      abs(sin(spiralPhase + 0.34))
    );
    float core = exp(-radius * 7.5);
    float disk = envelope * outerFade *
      (0.16 + arms * (0.72 + 0.45 * clumps) + secondaryArms * 0.24);

    vec3 blueDisk = mix(
      vec3(0.055, 0.18, 0.48),
      vec3(0.28, 0.72, 1.0),
      arms
    );
    vec3 color = blueDisk * disk * dust * 2.4;
    color += vec3(0.88, 0.95, 1.0) * core * 2.8;
    color += vec3(0.28, 0.5, 1.0) * envelope * 0.08;
    return color;
  }

  vec3 lensGalaxy(vec2 imagePosition) {
    float axisRatio = clamp(1.0 - uStellarEllipticity, 0.48, 1.0);
    vec2 p = rotate2d(LENS_ANGLE) * imagePosition;
    p /= vec2(0.16, 0.16 * axisRatio);
    float radius = length(p);
    float halo = exp(-radius * 1.65);
    float envelope = exp(-pow(radius, 0.78) * 2.6);
    float core = exp(-radius * 9.0);
    float dustLane = smoothstep(
      0.03,
      0.21,
      abs(p.y + 0.055 * sin(p.x * 3.4))
    );

    vec3 color = vec3(0.55, 0.25, 0.09) * halo * 0.3;
    color += vec3(0.95, 0.56, 0.2) * envelope * dustLane * 0.82;
    color += vec3(1.0, 0.9, 0.68) * core * 1.65;
    return color;
  }

  float segmentDistance(vec2 p, vec2 a, vec2 b) {
    vec2 line = b - a;
    float projection = clamp(
      dot(p - a, line) / max(dot(line, line), 0.000001),
      0.0,
      1.0
    );
    return length(p - (a + line * projection));
  }

  void main() {
    vec2 screen = vUv * 2.0 - 1.0;
    vec2 theta = vec2(screen.x * uAspect, screen.y);
    vec2 normalizedImage = theta / max(uEinsteinRadius, 0.0001);
    vec2 normalizedSource = lensMap(normalizedImage);
    vec2 beta = normalizedSource * uEinsteinRadius;
    vec2 sourceCenter = vec2(uSourceX, uSourceY) * uEinsteinRadius;
    vec2 sourcePosition = beta - sourceCenter;

    float nebula = valueNoise(beta * 2.2 + vec2(4.7, 1.3));
    float verticalCloud = exp(-abs(beta.y + beta.x * 0.13) * 2.7);
    vec3 color = vec3(0.0015, 0.0035, 0.011);
    color += vec3(0.012, 0.025, 0.07) *
      verticalCloud * (0.2 + nebula * 0.55);
    color += stars(beta);
    color += sourceGalaxy(sourcePosition);

    if (uShowLensGalaxy > 0.5) {
      color += lensGalaxy(theta);
    }

    if (uShowGuides > 0.5) {
      float determinant = jacobianDeterminant(normalizedImage);
      float criticalCurve = 1.0 -
        smoothstep(0.006, 0.045, abs(determinant));
      float curveDash = step(
        0.34,
        0.5 + 0.5 *
          sin(atan(normalizedImage.y, normalizedImage.x) * 46.0)
      );

      float sourceDistance = length(theta - sourceCenter);
      float sourceCircle = 1.0 - smoothstep(
        0.003,
        0.007,
        abs(sourceDistance - uSourceSize)
      );
      float guideLine = 1.0 - smoothstep(
        0.001,
        0.0035,
        segmentDistance(theta, vec2(0.0), sourceCenter)
      );
      float lineDash = step(
        0.25,
        0.5 + 0.5 * sin(length(theta) * 190.0)
      );
      float crosshair =
        (1.0 - smoothstep(
          0.001,
          0.003,
          abs(theta.x - sourceCenter.x)
        )) *
        (1.0 - smoothstep(
          uSourceSize * 1.15,
          uSourceSize * 1.5,
          abs(theta.y - sourceCenter.y)
        ));
      crosshair +=
        (1.0 - smoothstep(
          0.001,
          0.003,
          abs(theta.y - sourceCenter.y)
        )) *
        (1.0 - smoothstep(
          uSourceSize * 1.15,
          uSourceSize * 1.5,
          abs(theta.x - sourceCenter.x)
        ));

      float massRadius = stellarRadius(normalizedImage);
      float massContours = pow(
        0.5 + 0.5 * cos(massRadius * 18.0),
        22.0
      ) * (1.0 - smoothstep(0.25, 1.9, massRadius));
      float satelliteGuide = uShowSubstructure *
        (1.0 - smoothstep(
          0.008,
          0.026,
          abs(length(normalizedImage - SUBHALO_POSITION) - 0.08)
        ));

      color += vec3(0.42, 0.73, 1.0) *
        criticalCurve * curveDash * 0.62;
      color += vec3(0.22, 0.42, 0.66) * massContours * 0.075;
      color += vec3(0.61, 0.78, 0.95) * satelliteGuide * 0.4;
      color += vec3(0.38, 0.66, 0.92) * sourceCircle * 0.55;
      color += vec3(0.25, 0.52, 0.78) *
        guideLine * lineDash * 0.24;
      color += vec3(0.65, 0.84, 1.0) * crosshair * 0.5;
    }

    float vignette = 1.0 -
      smoothstep(0.12, 1.45, length(screen * vec2(0.78, 0.92)));
    color *= mix(0.62, 1.0, vignette);
    color = 1.0 - exp(-color * 1.18);
    color = pow(color, vec3(0.86));
    gl_FragColor = vec4(color, 1.0);
  }
`;
