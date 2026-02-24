import { useRef, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import {
    BufferGeometry,
    Float32BufferAttribute,
    Quaternion,
    Vector3,
    Camera,
} from 'three';
import { Html } from '@react-three/drei';

// ---------------------------------------------------------------------------
// Label type: each axis has a primary spatial label + optional tiled labels
// ---------------------------------------------------------------------------
export interface AxisLabelInfo {
    primary: string;   // spatial dimension label (e.g. "B", "C", "H")
    tiled: string[];   // tiled dimension labels sharing this axis (e.g. ["W"])
}

export interface AxisLabels {
    x: AxisLabelInfo;
    y: AxisLabelInfo;
    z: AxisLabelInfo;
}

// ---------------------------------------------------------------------------
// Arrow geometry helper: line from origin to tip + cone head + label
// ---------------------------------------------------------------------------
function ArrowLine({
    dir,
    color,
    label,
}: {
    dir: [number, number, number];
    color: string;
    label: AxisLabelInfo;
}) {
    const length = 1;
    const headLength = 0.2;
    const headRadius = 0.07;
    const shaftEnd = length - headLength;

    // Shaft: simple line from origin to start of cone
    const shaftGeo = useRef<BufferGeometry>(null);
    useEffect(() => {
        if (!shaftGeo.current) return;
        const verts = new Float32Array([
            0, 0, 0,
            dir[0] * shaftEnd, dir[1] * shaftEnd, dir[2] * shaftEnd,
        ]);
        shaftGeo.current.setAttribute('position', new Float32BufferAttribute(verts, 3));
    }, [dir, shaftEnd]);

    // Cone head orientation
    const coneDir = new Vector3(...dir).normalize();
    const conePos = coneDir.clone().multiplyScalar(shaftEnd + headLength / 2);
    const defaultDir = new Vector3(0, 1, 0);
    const quat = new Quaternion().setFromUnitVectors(defaultDir, coneDir);

    // Label position: past the tip
    const labelPos: [number, number, number] = [
        dir[0] * (length + 0.3),
        dir[1] * (length + 0.3),
        dir[2] * (length + 0.3),
    ];

    return (
        <group>
            {/* Shaft line */}
            <line>
                <bufferGeometry ref={shaftGeo} />
                <lineBasicMaterial color={color} linewidth={2} />
            </line>

            {/* Cone head */}
            <mesh position={[conePos.x, conePos.y, conePos.z]} quaternion={quat}>
                <coneGeometry args={[headRadius, headLength, 8]} />
                <meshBasicMaterial color={color} />
            </mesh>

            {/* Label: primary dimension + tiled dimensions */}
            <Html
                position={labelPos}
                center
                style={{
                    pointerEvents: 'none',
                    userSelect: 'none',
                    textAlign: 'center',
                    lineHeight: 1.2,
                    whiteSpace: 'nowrap',
                }}
            >
                {/* Primary spatial label */}
                <div style={{
                    color,
                    fontSize: '11px',
                    fontWeight: 700,
                    fontFamily: 'Inter, system-ui, sans-serif',
                    textShadow: '0 0 4px rgba(0,0,0,0.9)',
                }}>
                    {label.primary}
                </div>
                {/* Tiled dimension labels — shown smaller and dimmer */}
                {label.tiled.length > 0 && (
                    <div style={{
                        color,
                        fontSize: '8px',
                        fontWeight: 500,
                        fontFamily: 'Inter, system-ui, sans-serif',
                        opacity: 0.55,
                        textShadow: '0 0 3px rgba(0,0,0,0.8)',
                        marginTop: 1,
                    }}>
                        {label.tiled.join(', ')}
                    </div>
                )}
            </Html>
        </group>
    );
}

// ---------------------------------------------------------------------------
// Sync sub-scene camera rotation with main scene camera
// ---------------------------------------------------------------------------
function CameraSync({ mainCamera }: { mainCamera: Camera | null }) {
    const { camera } = useThree();

    useFrame(() => {
        if (!mainCamera) return;
        // Copy rotation only (not position) from main camera
        camera.quaternion.copy(mainCamera.quaternion);
        // Keep orthographic camera at a fixed distance looking at origin
        const offset = new Vector3(0, 0, 4).applyQuaternion(camera.quaternion);
        camera.position.copy(offset);
        camera.updateMatrixWorld();
    });

    return null;
}

// ---------------------------------------------------------------------------
// Inner scene content
// ---------------------------------------------------------------------------
function TriadContent({
    mainCamera,
    axisLabels,
}: {
    mainCamera: Camera | null;
    axisLabels: AxisLabels;
}) {
    return (
        <>
            <CameraSync mainCamera={mainCamera} />

            {/* Origin sphere */}
            <mesh>
                <sphereGeometry args={[0.06, 12, 12]} />
                <meshBasicMaterial color="#a1a1aa" />
            </mesh>

            {/*
              Arrow directions match index iteration in layout.ts:
                X: indices increase in +X  (x = rX + addX)
                Y: indices increase in -Y  (y = -rY - addY)
                Z: indices increase in -Z  (z = -rZ - addZ)
            */}
            <ArrowLine dir={[1, 0, 0]} color="#ef4444" label={axisLabels.x} />
            <ArrowLine dir={[0, -1, 0]} color="#22c55e" label={axisLabels.y} />
            <ArrowLine dir={[0, 0, -1]} color="#3b82f6" label={axisLabels.z} />
        </>
    );
}

// ---------------------------------------------------------------------------
// Public component
// ---------------------------------------------------------------------------
export interface AxisTriadProps {
    mainCamera: Camera | null;
    axisLabels?: AxisLabels;
}

const DEFAULT_LABELS: AxisLabels = {
    x: { primary: 'X', tiled: [] },
    y: { primary: 'Y', tiled: [] },
    z: { primary: 'Z', tiled: [] },
};

export function AxisTriad({ mainCamera, axisLabels }: AxisTriadProps) {
    const labels = axisLabels ?? DEFAULT_LABELS;

    return (
        <div
            style={{
                position: 'absolute',
                bottom: 16,
                right: 16,
                width: 140,
                height: 140,
                zIndex: 20,
                pointerEvents: 'none',
                borderRadius: 12,
                background: 'rgba(24, 24, 27, 0.65)',
                backdropFilter: 'blur(8px)',
                border: '1px solid rgba(63, 63, 70, 0.45)',
                boxShadow: '0 4px 24px rgba(0,0,0,0.35)',
            }}
        >
            <Canvas
                orthographic
                camera={{ zoom: 50, near: 0.1, far: 100, position: [0, 0, 4] }}
                style={{ pointerEvents: 'none' }}
            >
                <TriadContent mainCamera={mainCamera} axisLabels={labels} />
            </Canvas>
        </div>
    );
}
