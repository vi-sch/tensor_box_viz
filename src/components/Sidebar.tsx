
import type { ColorMode } from './TensorGrid';

interface SidebarProps {
    shapeStr: string;
    setShapeStr: (s: string) => void;
    dataStr: string;
    setDataStr: (s: string) => void;
    labelsStr: string;
    setLabelsStr: (s: string) => void;
    maxCells: number;
    setMaxCells: (n: number) => void;
    mode: 'tiling' | 'slicing';
    setMode: (m: 'tiling' | 'slicing') => void;
    dimOrder: 'first-to-last' | 'last-to-first';
    setDimOrder: (order: 'first-to-last' | 'last-to-first') => void;
    outerDims: number[];
    sliceIndices: Record<number, number>;
    setSliceIndex: (dim: number, idx: number) => void;
    shape: number[];
    colorMode: ColorMode;
    setColorMode: (mode: ColorMode) => void;
    cubeColor: string;
    setCubeColor: (color: string) => void;
    onExportPng: () => void;
    onExportJson: () => void;
}

export function Sidebar(props: SidebarProps) {
    const { shape, outerDims, sliceIndices, dimOrder, setDimOrder } = props;

    const labels = props.labelsStr.split(',').map(s => s.trim()).filter(Boolean);
    const getLabel = (dimIndex: number) => labels[dimIndex] || `d${dimIndex}`;

    return (
        <div className="w-80 h-full bg-zinc-900 text-zinc-300 p-4 flex flex-col gap-4 overflow-y-auto border-r border-zinc-800 text-sm">
            <h1 className="text-xl font-bold text-white mb-2">Tensor Grid Boxes</h1>

            <div className="flex flex-col gap-1">
                <label className="text-zinc-400">Shape (comma separated integers)</label>
                <input
                    value={props.shapeStr}
                    onChange={e => props.setShapeStr(e.target.value)}
                    className="bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-white"
                    placeholder="e.g. 2, 3, 4, 5"
                />
            </div>

            <div className="flex flex-col gap-1">
                <label className="text-zinc-400">Axis Labels (optional, comma separated)</label>
                <input
                    value={props.labelsStr}
                    onChange={e => props.setLabelsStr(e.target.value)}
                    className="bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-white"
                    placeholder="e.g. B, T, C, H, W"
                />
            </div>

            <div className="flex flex-col gap-1">
                <label className="text-zinc-400">JSON Data (optional nested array)</label>
                <textarea
                    value={props.dataStr}
                    onChange={e => props.setDataStr(e.target.value)}
                    className="bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-white h-20 resize-none font-mono text-xs"
                    placeholder="[[1, 2], [3, 4]]"
                />
            </div>

            <div className="h-px w-full bg-zinc-800 my-2" />

            <div>
                <h2 className="text-white font-semibold mb-2">Dimension Order</h2>
                <div className="flex gap-2">
                    <button
                        onClick={() => setDimOrder('first-to-last')}
                        className={`flex-1 px-3 py-1.5 rounded text-xs font-medium transition-colors ${dimOrder === 'first-to-last'
                            ? 'bg-blue-600 text-white'
                            : 'bg-zinc-800 border border-zinc-700 text-zinc-400 hover:text-white hover:bg-zinc-700'
                            }`}
                    >
                        First → Last
                    </button>
                    <button
                        onClick={() => setDimOrder('last-to-first')}
                        className={`flex-1 px-3 py-1.5 rounded text-xs font-medium transition-colors ${dimOrder === 'last-to-first'
                            ? 'bg-blue-600 text-white'
                            : 'bg-zinc-800 border border-zinc-700 text-zinc-400 hover:text-white hover:bg-zinc-700'
                            }`}
                    >
                        Last → First
                    </button>
                </div>
                <p className="text-zinc-500 text-xs mt-2">
                    {dimOrder === 'first-to-last'
                        ? 'Spatial axes use the first dimensions.'
                        : 'Spatial axes use the last dimensions.'}
                </p>
            </div>

            <div className="h-px w-full bg-zinc-800 my-2" />

            <div>
                <h2 className="text-white font-semibold mb-2">Outer Dimensions</h2>
                <div className="flex gap-4 mb-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input
                            type="radio"
                            checked={props.mode === 'tiling'}
                            onChange={() => props.setMode('tiling')}
                        />
                        Tiling
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input
                            type="radio"
                            checked={props.mode === 'slicing'}
                            onChange={() => props.setMode('slicing')}
                        />
                        Slicing
                    </label>
                </div>

                {outerDims.length > 0 ? (
                    <div className="flex flex-col gap-3">
                        {outerDims.map((dim) => {
                            // In tiling mode, all outer dims are tiled
                            // In slicing mode, all outer dims are sliced (pages)
                            if (props.mode === 'tiling') return null;

                            const curSlice = sliceIndices[dim] ?? 0;
                            return (
                                <div key={dim} className="flex flex-col gap-1">
                                    <div className="flex justify-between text-xs">
                                        <span className="text-zinc-300">Slice: {getLabel(dim)}</span>
                                        <span className="text-zinc-500">[{curSlice} / {shape[dim] - 1}]</span>
                                    </div>
                                    <input
                                        type="range"
                                        min={0}
                                        max={Math.max(0, shape[dim] - 1)}
                                        value={curSlice}
                                        onChange={(e) => props.setSliceIndex(dim, parseInt(e.target.value, 10))}
                                    />
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="text-zinc-500 italic text-xs">No outer dimensions (dim ≤ 3)</div>
                )}
            </div>

            <div className="h-px w-full bg-zinc-800 my-2" />

            <div className="flex flex-col gap-1">
                <div className="flex justify-between">
                    <label className="text-zinc-400">Max Cells / Dim</label>
                    <span className="text-zinc-300">{props.maxCells}</span>
                </div>
                <input
                    type="range"
                    min={2}
                    max={20}
                    value={props.maxCells}
                    onChange={e => props.setMaxCells(parseInt(e.target.value, 10))}
                />
                <span className="text-zinc-600 text-xs">High values may reduce performance.</span>
            </div>

            <div className="h-px w-full bg-zinc-800 my-2" />

            <div>
                <h2 className="text-white font-semibold mb-2">Cube Color</h2>
                <div className="flex gap-2 mb-3">
                    <button
                        onClick={() => props.setColorMode('uniform')}
                        className={`flex-1 px-3 py-1.5 rounded text-xs font-medium transition-colors ${props.colorMode === 'uniform'
                            ? 'bg-blue-600 text-white'
                            : 'bg-zinc-800 border border-zinc-700 text-zinc-400 hover:text-white hover:bg-zinc-700'
                            }`}
                    >
                        Uniform
                    </button>
                    <button
                        onClick={() => props.setColorMode('axis')}
                        className={`flex-1 px-3 py-1.5 rounded text-xs font-medium transition-colors ${props.colorMode === 'axis'
                            ? 'bg-blue-600 text-white'
                            : 'bg-zinc-800 border border-zinc-700 text-zinc-400 hover:text-white hover:bg-zinc-700'
                            }`}
                    >
                        Axis
                    </button>
                </div>

                {props.colorMode === 'uniform' ? (
                    <div className="flex items-center gap-3">
                        <input
                            type="color"
                            value={props.cubeColor}
                            onChange={e => props.setCubeColor(e.target.value)}
                            className="w-8 h-8 rounded border border-zinc-700 bg-zinc-800 cursor-pointer"
                            style={{ padding: 0 }}
                        />
                        <input
                            type="text"
                            value={props.cubeColor}
                            onChange={e => props.setCubeColor(e.target.value)}
                            className="bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-white font-mono text-xs flex-1"
                            placeholder="#3f3f46"
                        />
                    </div>
                ) : (
                    <div className="flex flex-col gap-1.5 text-xs">
                        <p className="text-zinc-500">Faces colored by their axis direction, matching the coordinate triad.</p>
                        <div className="flex gap-2">
                            <span className="flex items-center gap-1"><span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ background: '#ef4444' }} /> X</span>
                            <span className="flex items-center gap-1"><span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ background: '#22c55e' }} /> Y</span>
                            <span className="flex items-center gap-1"><span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ background: '#3b82f6' }} /> Z</span>
                        </div>
                    </div>
                )}
            </div>

            <div className="mt-auto pt-4 flex gap-2">
                <button
                    onClick={props.onExportPng}
                    className="flex-1 bg-zinc-800 hover:bg-zinc-700 py-1.5 rounded transition-colors"
                >
                    Export PNG
                </button>
                <button
                    onClick={props.onExportJson}
                    className="flex-1 bg-zinc-800 hover:bg-zinc-700 py-1.5 rounded transition-colors"
                >
                    Export JSON
                </button>
            </div>

        </div>
    );
}
