

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
    spatialDims: [number | null, number | null, number | null];
    setSpatialDims: (dims: [number | null, number | null, number | null]) => void;
    outerDims: number[];
    sliceIndices: Record<number, number>;
    setSliceIndex: (dim: number, idx: number) => void;
    shape: number[];
    onExportPng: () => void;
    onExportJson: () => void;
}

export function Sidebar(props: SidebarProps) {
    const { shape, outerDims, sliceIndices, spatialDims, setSpatialDims } = props;

    const handleSpatialChange = (axisIdx: number, val: string) => {
        const newDims = [...spatialDims] as [number | null, number | null, number | null];
        newDims[axisIdx] = val === 'none' ? null : parseInt(val, 10);
        setSpatialDims(newDims);
    };

    const labels = props.labelsStr.split(',').map(s => s.trim()).filter(Boolean);
    const getLabel = (dimIndex: number) => labels[dimIndex] || `d${dimIndex}`;

    return (
        <div className="w-80 h-full bg-zinc-900 text-zinc-300 p-4 flex flex-col gap-4 overflow-y-auto border-r border-zinc-800 text-sm">
            <h1 className="text-xl font-bold text-white mb-2">TensorGrid</h1>

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
                <h2 className="text-white font-semibold mb-2">Axes Mapping</h2>
                {['X', 'Y', 'Z'].map((axis, i) => (
                    <div key={axis} className="flex items-center justify-between mb-2">
                        <span className="text-zinc-400">Spatial {axis}:</span>
                        <select
                            value={spatialDims[i] ?? 'none'}
                            onChange={e => handleSpatialChange(i, e.target.value)}
                            className="bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-white"
                        >
                            <option value="none">None</option>
                            {shape.map((s, dimIdx) => (
                                <option key={dimIdx} value={dimIdx}>
                                    {getLabel(dimIdx)} (size: {s})
                                </option>
                            ))}
                        </select>
                    </div>
                ))}
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
                        {outerDims.map((dim, i) => {
                            // In tiling mode, last 2 are tiling, others are pages
                            // In slicing mode, all are pages
                            const isPage = props.mode === 'slicing' || i < outerDims.length - 2;
                            if (!isPage) return null; // handled by tiling layout automatically

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
