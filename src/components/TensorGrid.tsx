import { useRef, useMemo, useEffect, useState } from 'react';
import { InstancedMesh, Object3D, Color, BoxGeometry, EdgesGeometry } from 'three';
import type { BoxInstance } from '../lib/layout';

interface TensorGridProps {
    layout: BoxInstance[];
    onHover: (instance: BoxInstance | null) => void;
}

const colorScale = [
    new Color('#3b82f6'), // blue-500
    new Color('#10b981'), // emerald-500
    new Color('#f59e0b'), // amber-500
    new Color('#ef4444'), // red-500
];

function getColorForValue(val: number, min: number, max: number): Color {
    if (min === max) return colorScale[0];
    const t = Math.max(0, Math.min(1, (val - min) / (max - min)));
    const idx = t * (colorScale.length - 1);
    const left = Math.floor(idx);
    const right = Math.ceil(idx);
    if (left === right) return colorScale[left].clone();
    const c = colorScale[left].clone();
    c.lerp(colorScale[right], idx - left);
    return c;
}

const DEFAULT_COLOR = new Color('#3f3f46');

export function TensorGrid({ layout, onHover }: TensorGridProps) {
    const meshRef = useRef<InstancedMesh>(null);
    const edgesRef = useRef<InstancedMesh>(null);
    const dummy = useMemo(() => new Object3D(), []);

    const [hoveredId, setHoveredId] = useState<number | null>(null);

    const edgesGeom = useMemo(() => new EdgesGeometry(new BoxGeometry(1, 1, 1)), []);

    useEffect(() => {
        if (!meshRef.current || !edgesRef.current || layout.length === 0) return;

        let minVal = Infinity;
        let maxVal = -Infinity;
        let hasData = false;
        layout.forEach(l => {
            if (l.value !== undefined) {
                hasData = true;
                if (l.value < minVal) minVal = l.value;
                if (l.value > maxVal) maxVal = l.value;
            }
        });

        layout.forEach((inst, i) => {
            dummy.position.set(...inst.position);
            const isHovered = i === hoveredId;
            const scale = isHovered ? 0.95 : 0.85;
            dummy.scale.set(scale, scale, scale);
            dummy.updateMatrix();

            meshRef.current!.setMatrixAt(i, dummy.matrix);
            edgesRef.current!.setMatrixAt(i, dummy.matrix);

            let c = DEFAULT_COLOR;
            if (hasData && inst.value !== undefined) {
                c = getColorForValue(inst.value, minVal, maxVal);
            }

            const finalColor = c.clone();
            if (isHovered) {
                finalColor.lerp(new Color('white'), 0.4);
            }
            meshRef.current!.setColorAt(i, finalColor);
            edgesRef.current!.setColorAt(i, new Color(isHovered ? 'white' : '#18181b')); // edges
        });

        meshRef.current.instanceMatrix.needsUpdate = true;
        edgesRef.current.instanceMatrix.needsUpdate = true;
        if (meshRef.current.instanceColor) meshRef.current.instanceColor.needsUpdate = true;
        if (edgesRef.current.instanceColor) edgesRef.current.instanceColor.needsUpdate = true;

    }, [layout, hoveredId, dummy, edgesGeom]);

    if (layout.length === 0) return null;

    return (
        <group>
            <instancedMesh
                ref={meshRef}
                args={[undefined, undefined, layout.length]}
                onPointerMove={(e) => {
                    e.stopPropagation();
                    if (e.instanceId !== undefined && e.instanceId !== hoveredId) {
                        setHoveredId(e.instanceId);
                        onHover(layout[e.instanceId]);
                    }
                }}
                onPointerOut={(e) => {
                    e.stopPropagation();
                    setHoveredId(null);
                    onHover(null);
                }}
            >
                <boxGeometry args={[1, 1, 1]} />
                <meshStandardMaterial
                    roughness={0.4}
                    metalness={0.1}
                    toneMapped={false}
                    polygonOffset
                    polygonOffsetFactor={1}
                    polygonOffsetUnits={1}
                />
            </instancedMesh>

            <instancedMesh ref={edgesRef} args={[edgesGeom, undefined, layout.length]}>
                <lineBasicMaterial toneMapped={false} />
            </instancedMesh>
        </group>
    );
}
