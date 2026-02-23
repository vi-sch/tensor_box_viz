# Tensor Grid Box Visualizer

An interactive 3D web application to visualize N-dimensional rank tensor shapes as nested grid-box diagrams.

## Features

- **N-Dimensional Support**: Visualizes tensors up to rank 8. By default, maps up to 3 dimensions to X, Y, and Z spatial dimensions, while recursively tiling outer dimensions into 2D grids.
- **Tiling & Slicing Controls**: Choose between viewing all nested dimensions mapped in a large repeated tile layout (`Tiling`), or isolate single layers with sliders (`Slicing`).
- **Data Rendering**: Paste multi-dimensional JSON nested arrays into the sidebar to apply heatmap colors.
- **Performant**: Built using Three.js `InstancedMesh`, easily rendering thousands of cells at 60 FPS.
- **Simplified Rendering**: Uses opaque cubes with edge lines to ensure clear, artifact-free depth perception without complex multi-layered transparency.
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
* **Axes Mapping**: By default, the tool maps the first 3 dimensions to spatial coordinates following classic matrix format (rows, columns, depth):
  * **Y-Axis**: Maps to the *first* dimension (index 0, e.g., Rows). Rows are rendered from top to bottom.
  * **X-Axis**: Maps to the *second* dimension (index 1, e.g., Columns). Columns are rendered from left to right.
  * **Z-Axis**: Maps to the *third* dimension (index 2, e.g., Depth). Slices are layered towards the camera.

You can toggle between **Tiling** (layers repeated horizontally/vertically) or **Slicing** (viewing one specific slice along a dimension) modes to best suit your visualization needs.

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
