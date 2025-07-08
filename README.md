# General Relativity Playground

A browser-based interactive visualization of general relativity concepts. Drop point masses onto a 2D "rubber sheet" and watch real-time spacetime curvature using authentic Schwarzschild physics.

![Relativity Playground](https://img.shields.io/badge/physics-general%20relativity-blue) ![Next.js](https://img.shields.io/badge/Next.js-15-black) ![Three.js](https://img.shields.io/badge/Three.js-WebGL-red) ![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)

## Features

- **Authentic Physics**: Uses true Schwarzschild metric `h(r) = rs/r` where `rs = 2GM/c²`
- **Interactive Masses**: Drag and drop solar mass objects (0.5-10 M☉)
- **Real-time Visualization**: GPU-accelerated GLSL shaders for smooth 60fps+ performance
- **Collision Detection**: Prevents mass overlap with dynamic radius calculation
- **Responsive Design**: Works on desktop and mobile devices
- **Natural Units**: Uses G=1, c=1 scaling standard in theoretical physics

## Tech Stack

- **Framework**: Next.js 15 with App Router
- **3D Graphics**: Three.js with react-three-fiber
- **Shaders**: Custom GLSL vertex/fragment shaders
- **Styling**: Tailwind CSS v4
- **State Management**: Zustand
- **Language**: TypeScript

## Getting Started

### Prerequisites

- Node.js 18+
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
- `npm run lint` - Run ESLint
- `npm run format` - Format code with Prettier

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
