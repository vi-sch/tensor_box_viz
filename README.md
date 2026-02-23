# Tensor Grid Box Visualizer

An interactive 3D web application to visualize N-dimensional rank tensor shapes as nested grid-box diagrams.

## Features

- **N-Dimensional Support**: Visualizes tensors up to rank 8. By default, maps up to 3 dimensions to X, Y, and Z spatial dimensions, while recursively tiling outer dimensions into 2D grids.
- **Tiling & Slicing Controls**: Choose between viewing all nested dimensions mapped in a large repeated tile layout (`Tiling`), or isolate single layers with sliders (`Slicing`).
- **Data Rendering**: Paste multi-dimensional JSON nested arrays into the sidebar to apply heatmap colors.
- **Performant**: Built using Three.js `InstancedMesh`, easily rendering thousands of cells at 60 FPS.
- **Downsampling**: Dynamically samples large dimensions using uniform spacing to fit max cells without freezing the browser layout. 
- **Export**: Export scenes as PNG screenshots or save configuration settings as JSON.

## Setup and Usage

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Start Dev Server**:
   ```bash
   npm run dev
   ```

3. **Run Unit Tests**:
   ```bash
   npm run test
   ```

## Stack

- React
- TypeScript
- Three.js + React Three Fiber
- Tailwind CSS v4
- Vite
- Vitest
