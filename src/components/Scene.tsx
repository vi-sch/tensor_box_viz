import { Canvas } from '@react-three/fiber';
import { OrbitControls, Center, Environment } from '@react-three/drei';
import { TensorGrid } from './TensorGrid';
import type { BoxInstance } from '../lib/layout';

interface SceneProps {
    layout: BoxInstance[];
    onHover: (b: BoxInstance | null) => void;
}

export function Scene({ layout, onHover }: SceneProps) {
    return (
        <div className="w-full h-full bg-zinc-950 relative">
            <Canvas
                camera={{ position: [5, 5, 5], fov: 50 }}
                gl={{ preserveDrawingBuffer: true }}
                id="tensor-canvas"
            >
                <ambientLight intensity={0.6} />
                <directionalLight position={[10, 10, 10]} intensity={1.5} />
                <Environment preset="city" />
                <Center>
                    <TensorGrid layout={layout} onHover={onHover} />
                </Center>
                <OrbitControls makeDefault />
            </Canvas>
            {/* Fallback msg if no layout */}
            {layout.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center text-zinc-500 pointer-events-none">
                    Enter a valid shape to visualize layout
                </div>
            )}
        </div>
    );
}
