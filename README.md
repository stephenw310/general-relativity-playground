# Universe Lab

![Next.js](https://img.shields.io/badge/Next.js-16-black) ![Three.js](https://img.shields.io/badge/Three.js-WebGL-red) ![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)

Universe Lab is a browser-based collection of interactive visualizations for
exploring general relativity.

## Simulations

- **Spacetime Curvature** (`/spacetime`): Drag stellar objects across a rubber-sheet
  spacetime grid warped by the Schwarzschild metric.
- **Black Holes** (`/black-hole`): Orbit a Schwarzschild black hole with an event
  horizon, photon sphere, Doppler-beamed accretion disk, and screen-space
  gravitational lensing of the background stars.
- **Gravitational Lensing** (`/lensing`): Move a distant source behind a
  foreground galaxy to form multiple images, luminous arcs, and Einstein rings
  with GPU inverse ray shooting through stars, dark matter, tidal shear, and
  satellite substructure.
- **Time Dilation** (`/time-dilation`): Compare Schwarzschild proper time for
  independently static or orbiting clocks, accumulate proper time over ten-year
  runs, and load GPS, ISS, or cinematic extreme-gravity comparisons.
- **Geodesics** (`/geodesics`): Ray-trace null and timelike Schwarzschild
  geodesics with Newtonian ghost orbits, persistent trail galleries, live
  effective potentials, photon capture, strong deflection, and periapsis advance.
- **Gravitational Waves** (`/gravitational-waves`): Build a compact binary and
  release a one-shot Peters inspiral into a phenomenological merger/ringdown,
  hear its pitch-shifted chirp, and watch the same strain deform a detector ring.

## Features

- **Authentic Physics**: Uses true Schwarzschild metric `h(r) = rs/r` where `rs = 2GM/c²`
- **Interactive Masses**: Drag and drop solar mass objects (0.5-10 M☉)
- **Real-time Visualization**: GPU-accelerated GLSL shaders for smooth 60fps+ performance
- **Collision Detection**: Prevents mass overlap with dynamic radius calculation
- **Responsive Design**: Works on desktop and mobile devices, with device-adaptive quality
- **Natural Units**: Uses G=1, c=1 scaling standard in theoretical physics

## Data and model notes

- The gravitational-wave inspiral uses the leading-order Peters/quadrupole
  solution through `a = 3 GM/c²`, then joins continuously to a damped ringdown
  calibrated to GW150914. It is an educational approximation, not a
  numerical-relativity merger waveform.
- The dim GW150914 comparison trace is derived from the corrected 4,096 Hz H1
  open strain release from the [Gravitational Wave Open Science
  Center](https://gwosc.org/eventapi/html/O1_O2-Preliminary/GW150914/v2/),
  released under CC BY 4.0.

## Tech Stack

- **Framework**: Next.js 16 with App Router
- **3D Graphics**: Three.js with react-three-fiber
- **Shaders**: Custom GLSL vertex/fragment shaders
- **Styling**: Tailwind CSS v4
- **State Management**: Zustand
- **Language**: TypeScript
- **Lint/Format**: Biome
- **Git Hooks**: Lefthook

## Getting Started

### Prerequisites

- Node.js 20.9+
- npm

### Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/stephenw310/general-relativity-playground
   cd general-relativity-playground
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Run the development server:

   ```bash
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run typecheck` - Type check with `tsc --noEmit`
- `npm run lint` - Lint and check formatting with Biome
- `npm run lint:fix` - Apply Biome fixes, including Tailwind class sorting
- `npm run format` - Format code with Biome

Git hooks are managed by Lefthook and installed automatically by `npm install`.
On commit, Biome formats and fixes staged files and `tsc` type checks the
project.

## How to Use

1. **View the Grid**: The warped grid represents spacetime curvature
2. **Drag Masses**: Click and drag the colored spheres to move them
3. **Adjust Mass**: Use the control panel to change mass values (0.5-10 solar masses)
4. **Add/Remove**: Use buttons to add new masses or remove existing ones
5. **Navigate**:
   - Left click + drag: Rotate camera
   - Right click + drag: Pan camera
   - Scroll wheel: Zoom in/out

## Physics Implementation

The visualization uses the **Schwarzschild metric** for gravitational curvature:

```glsl
// Schwarzschild radius: rs = 2GM/c²
float schwarzschildRadius = 2.0 * G * mass / (c * c);
// Height displacement: h = rs/r
float height = schwarzschildRadius / distance;
```

- **G = 1.0**: Gravitational constant (scaled for visualization)
- **c = 1.0**: Speed of light (natural units)
- **Mass range**: 0.5-10 solar masses for realistic curvature

## License

MIT License
