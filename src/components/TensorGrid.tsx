import { useRef, useEffect, useMemo } from 'react';
import { InstancedMesh, Object3D, BoxGeometry, EdgesGeometry, Float32BufferAttribute, BufferGeometry } from 'three';
import type { BoxInstance } from '../lib/layout';

interface TensorGridProps {
    layout: BoxInstance[];
    onHover: (instance: BoxInstance | null) => void;
}

const dummy = new Object3D();
const SCALE = 0.85;

// Pre-compute edge template vertices from a unit box
const edgeTemplate = (() => {
    const box = new BoxGeometry(1, 1, 1);
    const edges = new EdgesGeometry(box);
    const pos = edges.getAttribute('position');
    const verts: number[] = [];
    for (let i = 0; i < pos.count; i++) {
        verts.push(pos.getX(i), pos.getY(i), pos.getZ(i));
    }
    box.dispose();
    edges.dispose();
    return verts;
})();

export function TensorGrid({ layout, onHover }: TensorGridProps) {
    const meshRef = useRef<InstancedMesh>(null);
    const linesRef = useRef<any>(null);

    // Build a merged line geometry for all box edges
    const edgesGeometry = useMemo(() => {
        if (layout.length === 0) return null;

        const vertsPerBox = edgeTemplate.length;
        const totalFloats = layout.length * vertsPerBox;
        const positions = new Float32Array(totalFloats);

        layout.forEach((inst, i) => {
            const [cx, cy, cz] = inst.position;
            const offset = i * vertsPerBox;

            for (let j = 0; j < vertsPerBox; j += 3) {
                positions[offset + j] = edgeTemplate[j] * SCALE + cx;
                positions[offset + j + 1] = edgeTemplate[j + 1] * SCALE + cy;
                positions[offset + j + 2] = edgeTemplate[j + 2] * SCALE + cz;
            }
        });

        const geo = new BufferGeometry();
        geo.setAttribute('position', new Float32BufferAttribute(positions, 3));
        return geo;
    }, [layout]);

    // Set instance matrices — only when layout changes
    useEffect(() => {
        if (!meshRef.current || layout.length === 0) return;

        layout.forEach((inst, i) => {
            dummy.position.set(...inst.position);
            dummy.scale.set(SCALE, SCALE, SCALE);
            dummy.updateMatrix();
            meshRef.current!.setMatrixAt(i, dummy.matrix);
        });

        meshRef.current.instanceMatrix.needsUpdate = true;
    }, [layout]);

    if (layout.length === 0) return null;

    return (
        <group key={layout.length}>
            <instancedMesh
                ref={meshRef}
                args={[undefined, undefined, layout.length]}
                onPointerMove={(e) => {
                    e.stopPropagation();
                    if (e.instanceId !== undefined) {
                        onHover(layout[e.instanceId]);
                    }
                }}
                onPointerOut={(e) => {
                    e.stopPropagation();
                    onHover(null);
                }}
            >
                <boxGeometry args={[1, 1, 1]} />
                <meshBasicMaterial color="#3f3f46" />
            </instancedMesh>
            {/* Black edge outlines as merged lineSegments */}
            {edgesGeometry && (
                <lineSegments ref={linesRef} geometry={edgesGeometry}>
                    <lineBasicMaterial color="black" />
                </lineSegments>
            )}
        </group>
    );
}
