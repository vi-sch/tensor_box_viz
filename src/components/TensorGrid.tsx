import { useRef, useEffect, useMemo, useCallback } from 'react';
import { InstancedMesh, Object3D, Color, BoxGeometry, EdgesGeometry, Float32BufferAttribute, BufferGeometry, Raycaster } from 'three';
import type { BoxInstance } from '../lib/layout';

interface TensorGridProps {
    layout: BoxInstance[];
    onHover: (instance: BoxInstance | null) => void;
}

const dummy = new Object3D();
const SCALE = 0.85;
const BASE_COLOR = new Color('#3f3f46');
const HOVER_COLOR = new Color('#818cf8'); // indigo-400

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
    const prevHoveredRef = useRef<number | null>(null);

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

    // Set instance matrices and base colors — only when layout changes
    useEffect(() => {
        const mesh = meshRef.current;
        if (!mesh || layout.length === 0) return;

        // Update instance count for when layout size changes
        mesh.count = layout.length;

        layout.forEach((inst, i) => {
            dummy.position.set(...inst.position);
            dummy.scale.set(SCALE, SCALE, SCALE);
            dummy.updateMatrix();
            mesh.setMatrixAt(i, dummy.matrix);
            mesh.setColorAt(i, BASE_COLOR);
        });

        mesh.instanceMatrix.needsUpdate = true;
        if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;

        // Critical: recompute bounding volumes so raycasting works for all instances
        mesh.computeBoundingBox();
        mesh.computeBoundingSphere();

        prevHoveredRef.current = null;
    }, [layout]);

    // Lightweight per-instance highlight: only touches 2 instances (old + new)
    const setHoverHighlight = useCallback((instanceId: number | null) => {
        const mesh = meshRef.current;
        if (!mesh) return;

        const prev = prevHoveredRef.current;
        if (prev === instanceId) return;

        // Reset previous
        if (prev !== null && prev < mesh.count) {
            mesh.setColorAt(prev, BASE_COLOR);
        }
        // Set new
        if (instanceId !== null && instanceId < mesh.count) {
            mesh.setColorAt(instanceId, HOVER_COLOR);
        }

        if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
        prevHoveredRef.current = instanceId;
    }, []);

    const handlePointerMove = useCallback((e: any) => {
        e.stopPropagation();
        if (e.instanceId !== undefined) {
            setHoverHighlight(e.instanceId);
            onHover(layout[e.instanceId] ?? null);
        }
    }, [layout, onHover, setHoverHighlight]);

    const handlePointerOut = useCallback((e: any) => {
        e.stopPropagation();
        setHoverHighlight(null);
        onHover(null);
    }, [onHover, setHoverHighlight]);

    if (layout.length === 0) return null;

    // Use a large enough maxCount to avoid remounting on layout size changes
    const maxCount = Math.max(layout.length, 512);

    return (
        <group>
            <instancedMesh
                ref={meshRef}
                args={[undefined, undefined, maxCount]}
                frustumCulled={false}
                onPointerMove={handlePointerMove}
                onPointerOut={handlePointerOut}
            >
                <boxGeometry args={[1, 1, 1]} />
                <meshBasicMaterial color="#ffffff" />
            </instancedMesh>
            {/* Black edge outlines — raycast disabled so they don't block hover on boxes */}
            {edgesGeometry && (
                <lineSegments geometry={edgesGeometry} raycast={() => null as unknown as void}>
                    <lineBasicMaterial color="black" />
                </lineSegments>
            )}
        </group>
    );
}
