export interface BoxInstance {
    id: string; // unique string based on indexPath
    position: [number, number, number];
    indexPath: number[];
    value?: number;
}

export interface LayoutConfig {
    shape: number[];
    spatialDims: [number | null, number | null, number | null]; // indices of XYZ bounds
    outerDims: number[]; // remaining indices
    mode: 'tiling' | 'slicing';
    sliceIndices: Record<number, number>; // index to slice for page dims or slicing dims
    maxCellsPerDim: number;
    data?: any[];
}

export function parseShape(input: string): number[] {
    const matches = input.match(/\d+/g);
    if (!matches) return [];
    return matches.map(Number).filter(n => n > 0).slice(0, 8); // max N=8
}

export function parseTensor(input: string): { shape: number[], data: any[] } | null {
    try {
        const data = JSON.parse(input);
        if (!Array.isArray(data)) return null;

        // Infer shape based on first elements recursively
        const shape: number[] = [];
        let curr = data;
        while (Array.isArray(curr)) {
            shape.push(curr.length);
            if (curr.length > 0) curr = curr[0];
            else break;
        }
        return { shape, data };
    } catch (e) {
        return null;
    }
}

export function getSampledIndices(size: number, maxCells: number): number[] {
    if (size <= maxCells) {
        return Array.from({ length: size }, (_, i) => i);
    }
    if (maxCells < 2) return [0];
    const step = (size - 1) / (maxCells - 1);
    const indices = new Set<number>();
    for (let i = 0; i < maxCells; i++) {
        indices.add(Math.round(i * step));
    }
    return Array.from(indices);
}

// Retrieves data value at index path
export function getValue(data: any[] | undefined, indexPath: number[]): number | undefined {
    if (!data || !Array.isArray(data)) return undefined;
    let curr: any = data;
    for (const idx of indexPath) {
        if (!Array.isArray(curr) || curr.length <= idx) return undefined;
        curr = curr[idx];
    }
    return typeof curr === 'number' ? curr : undefined;
}

export function computeLayout(config: LayoutConfig): BoxInstance[] {
    const { shape, spatialDims, outerDims, mode, sliceIndices, maxCellsPerDim, data } = config;
    if (shape.length === 0) return [];

    let activePageDims: number[] = [];
    let activeTileDims: number[] = [];

    if (mode === 'slicing') {
        activePageDims = [...outerDims];
    } else {
        // Tiling mode propagates through all N outer dimensions
        activePageDims = [];
        activeTileDims = [...outerDims];
    }

    // Determine Sampled Indices
    const dimIndices: number[][] = shape.map((size, d) => {
        if (activePageDims.includes(d)) {
            let idx = sliceIndices[d] ?? 0;
            idx = Math.max(0, Math.min(idx, size - 1));
            return [idx]; // Single forced index for active pages
        }
        return getSampledIndices(size, maxCellsPerDim);
    });

    const [sx, sy, sz] = spatialDims;
    const blockSizeX = sx !== null ? dimIndices[sx].length : 1;
    const blockSizeY = sy !== null ? dimIndices[sy].length : 1;
    const blockSizeZ = sz !== null ? dimIndices[sz].length : 1;

    const SPACING = 2; // gaps between replicated cubes
    const stepX = blockSizeX + SPACING;
    const stepY = blockSizeY + SPACING;
    const stepZ = blockSizeZ + SPACING;

    // Calculate step size for each tiled dimension
    // Cycle: rows (Y) -> columns (X) -> depth (Z) -> repeat
    const tileSteps = new Map<number, { axis: 'x' | 'y' | 'z', step: number }>();
    let currentStepY = stepY;
    let currentStepX = stepX;
    let currentStepZ = stepZ;

    if (mode === 'tiling') {
        activeTileDims.forEach((dim, i) => {
            const numCells = dimIndices[dim].length;
            const axisIndex = i % 3;
            if (axisIndex === 0) {
                // Tile dim follows Y (rows)
                tileSteps.set(dim, { axis: 'y', step: currentStepY });
                currentStepY = currentStepY * numCells + SPACING;
            } else if (axisIndex === 1) {
                // Tile dim follows X (columns)
                tileSteps.set(dim, { axis: 'x', step: currentStepX });
                currentStepX = currentStepX * numCells + SPACING;
            } else {
                // Tile dim follows Z (depth)
                tileSteps.set(dim, { axis: 'z', step: currentStepZ });
                currentStepZ = currentStepZ * numCells + SPACING;
            }
        });
    }

    const instances: BoxInstance[] = [];

    function recurse(dim: number, currentPath: number[]) {
        if (dim === shape.length) {
            const indexPath = [...currentPath];

            const rX = sx !== null ? dimIndices[sx].indexOf(indexPath[sx]) : 0;
            const rY = sy !== null ? dimIndices[sy].indexOf(indexPath[sy]) : 0;
            const rZ = sz !== null ? dimIndices[sz].indexOf(indexPath[sz]) : 0;

            let addX = 0, addY = 0, addZ = 0;
            for (const tileDim of activeTileDims) {
                const info = tileSteps.get(tileDim);
                if (info) {
                    const idx = dimIndices[tileDim].indexOf(indexPath[tileDim]);
                    if (info.axis === 'x') {
                        addX += idx * info.step;
                    } else if (info.axis === 'y') {
                        addY += idx * info.step;
                    } else {
                        addZ += idx * info.step;
                    }
                }
            }

            const x = rX + addX;
            const y = -rY - addY;
            const z = -rZ - addZ;

            instances.push({
                id: indexPath.join(','),
                position: [x, y, z],
                indexPath,
                value: getValue(data, indexPath),
            });
            return;
        }

        for (const val of dimIndices[dim]) {
            currentPath.push(val);
            recurse(dim + 1, currentPath);
            currentPath.pop();
        }
    }

    recurse(0, []);

    return centerPositions(instances);
}

function centerPositions(instances: BoxInstance[]) {
    if (instances.length === 0) return instances;

    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    let minZ = Infinity, maxZ = -Infinity;

    for (const inst of instances) {
        const [x, y, z] = inst.position;
        if (x < minX) minX = x; if (x > maxX) maxX = x;
        if (y < minY) minY = y; if (y > maxY) maxY = y;
        if (z < minZ) minZ = z; if (z > maxZ) maxZ = z;
    }

    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    const cz = (minZ + maxZ) / 2;

    for (const inst of instances) {
        inst.position[0] -= cx;
        inst.position[1] -= cy;
        inst.position[2] -= cz;
    }
    return instances;
}
