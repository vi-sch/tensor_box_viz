# Tensor Grid Box Visualizer

An interactive 3D web application to visualize N-dimensional rank tensor shapes as nested grid-box diagrams.

## Features

- **N-Dimensional Support**: Visualizes tensors up to rank 8. By default, maps up to 3 dimensions to X, Y, and Z spatial dimensions, while recursively tiling outer dimensions along the rows (Y), columns (X), and depth (Z) axes in a repeating cycle.
- **Tiling & Slicing Controls**: Choose between viewing all nested dimensions mapped in a large repeated tile layout (`Tiling`), or isolate single layers with sliders (`Slicing`).
- **Data Rendering**: Paste multi-dimensional JSON nested arrays into the sidebar to apply heatmap colors.
- **Performant**: Built using Three.js `InstancedMesh` with GPU instancing, layout-only geometry recomputation, no per-instance CPU color computation, and unlit `meshBasicMaterial` — easily rendering thousands of cells at 60 FPS.
- **Simplified Rendering**: Uses solid opaque flat-colored cubes with black edge outlines. Faces properly occlude edges behind them (not wireframe), giving clear cell boundaries and artifact-free depth perception.
- **Downsampling**: Dynamically samples large dimensions using uniform spacing to fit max cells without freezing the browser layout. 
- **Export**: Export scenes as PNG screenshots or save configuration settings as JSON.

## Setup and Usage

### Quick Start

1. **Install Dependencies**:
   ```bash
   npm install
   ```
2. **Start Dev Server**:
   ```bash
   npm run dev
   ```

### How to use this program

When the application loads, you can configure your tensor's shape on the left sidebar:
* **Shape**: A comma-separated list of integers (e.g., `2, 3, 4, 5` representing `[Batch, Channel, Height, Width]`).
* **Dimension Order**: Choose how dimensions are assigned to spatial axes:
  * **First → Last** (default): The first dimensions map to spatial axes (Y→d0, X→d1, Z→d2). Remaining higher dimensions become outer/tiled dimensions.
  * **Last → First**: The last dimensions map to spatial axes. Remaining lower dimensions become outer/tiled dimensions.

You can toggle between **Tiling** or **Slicing** modes to best suit your visualization needs:
* **Tiling**: Layers are repeated outward to display the full N-dimensional space. Outer dimensions cycle through **rows (Y) → columns (X) → depth (Z)** and repeat. For example, for a 6D tensor with 3 spatial dims, the 4th dimension tiles along Y, the 5th along X, and the 6th along Z. Additional dimensions repeat the cycle (7th→Y, 8th→X, etc.).
* **Slicing**: View one specific slice along a dimension using sliders.

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
