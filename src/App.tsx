import { useState, useMemo } from 'react';
import { Sidebar } from './components/Sidebar';
import { Scene } from './components/Scene';
import { parseShape, parseTensor, computeLayout, type BoxInstance } from './lib/layout';
import type { AxisLabels } from './components/AxisTriad';

export default function App() {
  const [shapeStr, setShapeStr] = useState('2, 3, 4, 5'); // Example shape [B, C, H, W]
  const [dataStr, setDataStr] = useState('');

  // Reset when shape string changes
  const handleSetShapeStr = (s: string) => {
    setShapeStr(s);
    setSliceIndices({});
  };
  const [labelsStr, setLabelsStr] = useState('B, C, H, W');
  const [maxCells, setMaxCells] = useState(8);
  const [mode, setMode] = useState<'tiling' | 'slicing'>('tiling');

  const [dimOrder, setDimOrder] = useState<'first-to-last' | 'last-to-first'>('first-to-last');

  const [sliceIndices, setSliceIndices] = useState<Record<number, number>>({});
  const [hovered, setHovered] = useState<BoxInstance | null>(null);

  // Compute derived state
  const tensorData = useMemo(() => {
    if (!dataStr.trim()) return null;
    return parseTensor(dataStr);
  }, [dataStr]);

  const shape = useMemo(() => {
    if (tensorData) return tensorData.shape;
    return parseShape(shapeStr);
  }, [shapeStr, tensorData]);

  // Determine active spatial dims based on dimension order
  const effectiveSpatialDims = useMemo(() => {
    const l = shape.length;
    if (dimOrder === 'first-to-last') {
      // First dims map to spatial: dim0→Y, dim1→X, dim2→Z
      return [
        l >= 2 ? 1 : null, // X
        l >= 1 ? 0 : null, // Y
        l >= 3 ? 2 : null, // Z
      ] as [number | null, number | null, number | null];
    } else {
      // Last dims map to spatial: last→Y, second-to-last→X, third-to-last→Z
      return [
        l >= 2 ? l - 2 : null, // X
        l >= 1 ? l - 1 : null, // Y
        l >= 3 ? l - 3 : null, // Z
      ] as [number | null, number | null, number | null];
    }
  }, [dimOrder, shape.length]);

  const validSpatialDims = effectiveSpatialDims.map(d => (d !== null && d >= 0 && d < shape.length) ? d : null) as [number | null, number | null, number | null];
  const outerDims = useMemo(() => {
    return shape.map((_, i) => i).filter(d => !validSpatialDims.includes(d));
  }, [shape, validSpatialDims]);

  const layout = useMemo(() => {
    return computeLayout({
      shape,
      spatialDims: validSpatialDims,
      outerDims,
      mode,
      sliceIndices,
      maxCellsPerDim: maxCells,
      data: tensorData?.data
    });
  }, [shape, validSpatialDims, outerDims, mode, sliceIndices, maxCells, tensorData]);

  const handleSetSliceIndex = (dim: number, idx: number) => {
    setSliceIndices(prev => ({ ...prev, [dim]: idx }));
  };

  const handleExportPng = () => {
    const canvas = document.querySelector('#tensor-canvas canvas') as HTMLCanvasElement;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = 'tensor-grid.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  const handleExportJson = () => {
    const config = { shape, spatialDims: validSpatialDims, outerDims, mode, maxCells, sliceIndices };
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.download = 'tensor-grid-settings.json';
    link.href = URL.createObjectURL(blob);
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const labels = labelsStr.split(',').map(s => s.trim()).filter(Boolean);

  // Build axis labels for the coordinate triad
  // Includes primary spatial dim labels + tiled dim labels grouped by axis
  const axisLabels = useMemo((): AxisLabels => {
    const getLabel = (dimIdx: number | null, fallback: string) => {
      if (dimIdx === null) return fallback;
      return labels[dimIdx] || `d${dimIdx}`;
    };
    const [sx, sy, sz] = validSpatialDims;

    // Compute tiled dims per axis (cycle: Y → X → Z → repeat)
    // This mirrors the logic in layout.ts activeTileDims.forEach
    const tiledX: string[] = [];
    const tiledY: string[] = [];
    const tiledZ: string[] = [];
    if (mode === 'tiling') {
      outerDims.forEach((dim, i) => {
        const axisIdx = i % 3;
        const dimLabel = labels[dim] || `d${dim}`;
        if (axisIdx === 0) tiledY.push(dimLabel);      // tile cycle: Y first
        else if (axisIdx === 1) tiledX.push(dimLabel);  // then X
        else tiledZ.push(dimLabel);                     // then Z
      });
    }

    return {
      x: { primary: getLabel(sx, 'X'), tiled: tiledX },
      y: { primary: getLabel(sy, 'Y'), tiled: tiledY },
      z: { primary: getLabel(sz, 'Z'), tiled: tiledZ },
    };
  }, [validSpatialDims, labels, outerDims, mode]);

  return (
    <div className="flex w-screen h-screen overflow-hidden bg-zinc-950 font-sans text-sm selection:bg-zinc-700">
      <Sidebar
        shapeStr={shapeStr} setShapeStr={handleSetShapeStr}
        dataStr={dataStr} setDataStr={setDataStr}
        labelsStr={labelsStr} setLabelsStr={setLabelsStr}
        maxCells={maxCells} setMaxCells={setMaxCells}
        mode={mode} setMode={setMode}
        dimOrder={dimOrder} setDimOrder={setDimOrder}
        outerDims={outerDims}
        sliceIndices={sliceIndices} setSliceIndex={handleSetSliceIndex}
        shape={shape}
        onExportPng={handleExportPng}
        onExportJson={handleExportJson}
      />

      <div className="flex-1 relative">
        <Scene layout={layout} onHover={setHovered} axisLabels={axisLabels} />

        {/* Tooltip Overlay */}
        {hovered && (
          <div className="absolute bottom-6 left-6 bg-zinc-900 border border-zinc-700 text-white px-4 py-3 rounded-lg shadow-xl pointer-events-none z-10 transition-opacity">
            <div className="font-semibold text-zinc-300 mb-2">Index Path</div>
            <div className="font-mono text-xs flex gap-1.5 flex-wrap">
              {hovered.indexPath.map((idx, i) => (
                <span key={i} className="bg-zinc-800 border border-zinc-700 px-1.5 py-0.5 rounded text-zinc-100">
                  {labels[i] || `d${i}`}=<span className="text-blue-400">{idx}</span>
                </span>
              ))}
            </div>
            {hovered.value !== undefined && (
              <div className="mt-3 text-sm border-t border-zinc-800 pt-2">
                <span className="text-zinc-500">Value:</span>{' '}
                <span className="font-mono text-emerald-400 font-medium">{hovered.value}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
