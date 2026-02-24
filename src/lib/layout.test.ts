import { describe, it, expect } from 'vitest';
import { parseShape, parseTensor, getSampledIndices, computeLayout } from './layout';

describe('Layout Logic', () => {
    it('parses shapes correctly', () => {
        expect(parseShape('[10, 20]')).toEqual([10, 20]);
        expect(parseShape('B: 10, L: 20')).toEqual([10, 20]);
        expect(parseShape('[4, 4, 4]')).toEqual([4, 4, 4]);
    });

    it('parses JSON tensors correctly', () => {
        const tens = parseTensor('[[1, 2], [3, 4]]');
        expect(tens?.shape).toEqual([2, 2]);
        expect(tens?.data).toEqual([[1, 2], [3, 4]]);
    });

    it('samples indices correctly', () => {
        expect(getSampledIndices(5, 8)).toEqual([0, 1, 2, 3, 4]);
        expect(getSampledIndices(10, 4)).toEqual([0, 3, 6, 9]);
        expect(getSampledIndices(100, 5)).toEqual([0, 25, 50, 74, 99]);
    });

    it('computes 1D layout correctly', () => {
        const layout = computeLayout({
            shape: [10],
            spatialDims: [0, null, null],
            outerDims: [],
            maxCellsPerDim: 10,
            mode: 'tiling',
            sliceIndices: {}
        });
        expect(layout.length).toBe(10);
        // x should go from -4.5 to 4.5
        expect(layout[0].position[0]).toBeCloseTo(-4.5);
        expect(layout[9].position[0]).toBeCloseTo(4.5);
    });

    it('computes 3D layout correctly', () => {
        const layout = computeLayout({
            shape: [4, 4, 4],
            spatialDims: [0, 1, 2],
            outerDims: [],
            maxCellsPerDim: 8,
            mode: 'tiling',
            sliceIndices: {}
        });
        expect(layout.length).toBe(64);
    });

    it('computes 4D tiling layout correctly', () => {
        const layout = computeLayout({
            shape: [2, 3, 4, 5],
            spatialDims: [1, 2, 3],
            outerDims: [0],
            maxCellsPerDim: 8,
            mode: 'tiling',
            sliceIndices: {}
        });
        // 2 * (3 * 4 * 5) = 120
        expect(layout.length).toBe(120);
    });

    it('computes 4D slicing layout correctly', () => {
        const layout = computeLayout({
            shape: [2, 3, 4, 5],
            spatialDims: [1, 2, 3],
            outerDims: [0],
            maxCellsPerDim: 8,
            mode: 'slicing',
            sliceIndices: { 0: 1 } // slice index 1 of dim 0
        });
        // Only 1 slice of the first dim (size 2), so 1 * 3 * 4 * 5 = 60
        expect(layout.length).toBe(60);
        // All should have indexPath[0] === 1
        expect(layout.every(l => l.indexPath[0] === 1)).toBe(true);
    });

    it('computes 6D tiling layout correctly', () => {
        const layout = computeLayout({
            shape: [2, 2, 2, 3, 4, 5],
            spatialDims: [3, 4, 5], // 3, 4, 5
            outerDims: [0, 1, 2], // 0: page, 1: tileY, 2: tileX
            maxCellsPerDim: 8,
            mode: 'tiling',
            sliceIndices: { 0: 0 }
        });
        // Dim 0, 1, 2 are all tiled dims, sizes 2, 2, 2.
        // Spaces: 2 * 2 * 2 * (3 * 4 * 5) = 480
        expect(layout.length).toBe(480);
    });
});
