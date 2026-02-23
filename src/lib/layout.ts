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
        // Tiling mode lets up to 2 outer dims tile in X and Y
        activePageDims = outerDims.slice(0, Math.max(0, outerDims.length - 2));
        activeTileDims = outerDims.slice(Math.max(0, outerDims.length - 2));
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

    const SPACING = 2; // gaps between replicated cubes
    const stepX = blockSizeX + SPACING;
    const stepY = blockSizeY + SPACING;

    const instances: BoxInstance[] = [];

    function recurse(dim: number, currentPath: number[]) {
        if (dim === shape.length) {
            const indexPath = [...currentPath];

            const rX = sx !== null ? dimIndices[sx].indexOf(indexPath[sx]) : 0;
            const rY = sy !== null ? dimIndices[sy].indexOf(indexPath[sy]) : 0;
            const rZ = sz !== null ? dimIndices[sz].indexOf(indexPath[sz]) : 0;

            let tx = 0, ty = 0;
            if (activeTileDims.length === 2) {
                const [dY, dX] = activeTileDims;
                ty = dimIndices[dY].indexOf(indexPath[dY]);
                tx = dimIndices[dX].indexOf(indexPath[dX]);
            } else if (activeTileDims.length === 1) {
                const [dX] = activeTileDims;
                tx = dimIndices[dX].indexOf(indexPath[dX]);
            }

            const x = rX + (tx * stepX);
            const y = -rY - (ty * stepY);
            const z = rZ;

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
