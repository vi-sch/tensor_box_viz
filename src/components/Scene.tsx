import { useRef, useState, useEffect } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, Center } from '@react-three/drei';
import { TensorGrid, type ColorMode } from './TensorGrid';
import { AxisTriad, type AxisLabels } from './AxisTriad';
import type { BoxInstance } from '../lib/layout';
import type { Camera } from 'three';

interface SceneProps {
    layout: BoxInstance[];
    onHover: (b: BoxInstance | null) => void;
    axisLabels?: AxisLabels;
    colorMode: ColorMode;
    cubeColor: string;
}

/** Tiny helper rendered *inside* the main Canvas to expose the camera ref */
function CameraExposer({ onCamera }: { onCamera: (c: Camera) => void }) {
    const { camera } = useThree();
    const reported = useRef(false);
    useEffect(() => {
        if (!reported.current) {
            onCamera(camera);
            reported.current = true;
        }
    }, [camera, onCamera]);
    return null;
}

export function Scene({ layout, onHover, axisLabels, colorMode, cubeColor }: SceneProps) {
    const [mainCamera, setMainCamera] = useState<Camera | null>(null);

    return (
        <div className="w-full h-full bg-zinc-950 relative">
            <Canvas
                camera={{ position: [5, 5, 5], fov: 50 }}
                gl={{ preserveDrawingBuffer: true }}
                id="tensor-canvas"
            >
                <CameraExposer onCamera={setMainCamera} />

                <Center>
                    <TensorGrid layout={layout} onHover={onHover} colorMode={colorMode} cubeColor={cubeColor} />
                </Center>
                <OrbitControls makeDefault />
            </Canvas>

            {/* Coordinate system triad overlay */}
            <AxisTriad mainCamera={mainCamera} axisLabels={axisLabels} />

            {/* Fallback msg if no layout */}
            {layout.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center text-zinc-500 pointer-events-none">
                    Enter a valid shape to visualize layout
                </div>
            )}
        </div>
    );
}
