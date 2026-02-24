import { useRef, useEffect, useMemo, useCallback } from 'react';
import {
    InstancedMesh, Object3D, Color, BoxGeometry, EdgesGeometry,
    ShaderMaterial, InstancedBufferGeometry,
    InstancedBufferAttribute, Float32BufferAttribute
} from 'three';
import { useFrame } from '@react-three/fiber';
import type { BoxInstance } from '../lib/layout';

export type ColorMode = 'uniform' | 'axis';

interface TensorGridProps {
    layout: BoxInstance[];
    onHover: (instance: BoxInstance | null) => void;
    colorMode: ColorMode;
    cubeColor: string;
}

const dummy = new Object3D();
const SCALE = 0.85;
const HOVER_COLOR = new Color('#818cf8'); // indigo-400

// Axis colors matching the coordinate triad (AxisTriad.tsx)
const AXIS_X_COLOR = new Color('#ef4444'); // red
const AXIS_Y_COLOR = new Color('#22c55e'); // green
const AXIS_Z_COLOR = new Color('#3b82f6'); // blue

// Pre-compute edge template vertices from a unit box (24 vertices = 12 edges * 2 endpoints)
const edgeTemplatePositions = (() => {
    const box = new BoxGeometry(1, 1, 1);
    const edges = new EdgesGeometry(box);
    const pos = edges.getAttribute('position');
    const arr = new Float32Array(pos.count * 3);
    for (let i = 0; i < pos.count; i++) {
        arr[i * 3] = pos.getX(i) * SCALE;
        arr[i * 3 + 1] = pos.getY(i) * SCALE;
        arr[i * 3 + 2] = pos.getZ(i) * SCALE;
    }
    box.dispose();
    edges.dispose();
    return arr;
})();

// Custom shader material for instanced edges — applies per-instance offset
const edgeShaderMaterial = new ShaderMaterial({
    vertexShader: `
        attribute vec3 instanceOffset;
        void main() {
            vec3 transformed = position + instanceOffset;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(transformed, 1.0);
        }
    `,
    fragmentShader: `
        void main() {
            gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0); // black edges
        }
    `,
});

/**
 * Build a BoxGeometry with per-vertex colors based on face normals (axis coloring).
 * BoxGeometry has 6 faces × 2 triangles × 3 vertices = 36 vertices.
 * The normal attribute tells us which axis each face aligns with:
 *   ±X normals → red, ±Y normals → green, ±Z normals → blue
 */
function buildAxisColoredBoxGeometry(): BoxGeometry {
    const geo = new BoxGeometry(1, 1, 1);
    const normals = geo.getAttribute('normal');
    const count = normals.count;
    const colors = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
        const nx = Math.abs(normals.getX(i));
        const ny = Math.abs(normals.getY(i));
        const nz = Math.abs(normals.getZ(i));

        let c: Color;
        if (nx > ny && nx > nz) {
            c = AXIS_X_COLOR; // X-facing → red
        } else if (ny > nx && ny > nz) {
            c = AXIS_Y_COLOR; // Y-facing → green
        } else {
            c = AXIS_Z_COLOR; // Z-facing → blue
        }

        colors[i * 3] = c.r;
        colors[i * 3 + 1] = c.g;
        colors[i * 3 + 2] = c.b;
    }

    geo.setAttribute('color', new Float32BufferAttribute(colors, 3));
    return geo;
}

export function TensorGrid({ layout, onHover, colorMode, cubeColor }: TensorGridProps) {
    const meshRef = useRef<InstancedMesh>(null);
    const prevHoveredRef = useRef<number | null>(null);

    // Track current color state to restore after hover
    const baseColor = useMemo(() => new Color(cubeColor), [cubeColor]);

    // Throttle: store pending pointer event, process once per frame
    const pendingPointerRef = useRef<{ instanceId: number | undefined } | null>(null);
    const pointerOutPendingRef = useRef(false);

    // Keep refs to avoid re-creating callbacks
    const layoutRef = useRef(layout);
    layoutRef.current = layout;
    const onHoverRef = useRef(onHover);
    onHoverRef.current = onHover;
    const colorModeRef = useRef(colorMode);
    colorModeRef.current = colorMode;
    const baseColorRef = useRef(baseColor);
    baseColorRef.current = baseColor;

    // Stable maxCount — only grows, never shrinks, to avoid remounting the InstancedMesh
    const maxCountRef = useRef(512);
    const maxCount = useMemo(() => {
        maxCountRef.current = Math.max(maxCountRef.current, layout.length);
        return maxCountRef.current;
    }, [layout.length]);

    // Build geometries for different modes
    const uniformBoxGeo = useMemo(() => new BoxGeometry(1, 1, 1), []);
    const axisBoxGeo = useMemo(() => buildAxisColoredBoxGeometry(), []);

    const activeGeo = colorMode === 'axis' ? axisBoxGeo : uniformBoxGeo;

    // Build instanced edge geometry — shares one edge template across all instances
    const edgesGeometry = useMemo(() => {
        if (layout.length === 0) return null;

        const geo = new InstancedBufferGeometry();
        geo.setAttribute('position', new Float32BufferAttribute(edgeTemplatePositions, 3));

        const offsets = new Float32Array(layout.length * 3);
        for (let i = 0; i < layout.length; i++) {
            offsets[i * 3] = layout[i].position[0];
            offsets[i * 3 + 1] = layout[i].position[1];
            offsets[i * 3 + 2] = layout[i].position[2];
        }
        geo.setAttribute('instanceOffset', new InstancedBufferAttribute(offsets, 3));
        geo.instanceCount = layout.length;

        return geo;
    }, [layout]);

    // Dispose old edge geometries on cleanup
    useEffect(() => {
        return () => {
            edgesGeometry?.dispose();
        };
    }, [edgesGeometry]);

    // Set instance matrices and base colors — when layout or color settings change
    useEffect(() => {
        const mesh = meshRef.current;
        if (!mesh || layout.length === 0) return;

        mesh.count = layout.length;

        for (let i = 0; i < layout.length; i++) {
            const inst = layout[i];
            dummy.position.set(inst.position[0], inst.position[1], inst.position[2]);
            dummy.scale.set(SCALE, SCALE, SCALE);
            dummy.updateMatrix();
            mesh.setMatrixAt(i, dummy.matrix);

            // In axis mode, we use white instance color so vertex colors show through.
            // In uniform mode, we set the chosen base color per-instance.
            if (colorMode === 'axis') {
                mesh.setColorAt(i, new Color('#ffffff'));
            } else {
                mesh.setColorAt(i, baseColor);
            }
        }

        mesh.instanceMatrix.needsUpdate = true;
        if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;

        mesh.computeBoundingBox();
        mesh.computeBoundingSphere();

        prevHoveredRef.current = null;
    }, [layout, colorMode, baseColor]);

    // Lightweight per-instance highlight: only touches 2 instances (old + new)
    const setHoverHighlight = useCallback((instanceId: number | null) => {
        const mesh = meshRef.current;
        if (!mesh) return;

        const prev = prevHoveredRef.current;
        if (prev === instanceId) return;

        const restoreColor = colorModeRef.current === 'axis'
            ? new Color('#ffffff')
            : baseColorRef.current;

        if (prev !== null && prev < mesh.count) {
            mesh.setColorAt(prev, restoreColor);
        }
        if (instanceId !== null && instanceId < mesh.count) {
            mesh.setColorAt(instanceId, HOVER_COLOR);
        }

        if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
        prevHoveredRef.current = instanceId;
    }, []);

    // Process hover events once per frame
    useFrame(() => {
        if (pointerOutPendingRef.current) {
            pointerOutPendingRef.current = false;
            pendingPointerRef.current = null;
            setHoverHighlight(null);
            onHoverRef.current(null);
            return;
        }

        const pending = pendingPointerRef.current;
        if (pending === null) return;
        pendingPointerRef.current = null;

        if (pending.instanceId !== undefined) {
            setHoverHighlight(pending.instanceId);
            onHoverRef.current(layoutRef.current[pending.instanceId] ?? null);
        }
    });

    const handlePointerMove = useCallback((e: any) => {
        e.stopPropagation();
        pointerOutPendingRef.current = false;
        pendingPointerRef.current = { instanceId: e.instanceId };
    }, []);

    const handlePointerOut = useCallback((e: any) => {
        e.stopPropagation();
        pointerOutPendingRef.current = true;
    }, []);

    if (layout.length === 0) return null;

    return (
        <group>
            <instancedMesh
                key={colorMode}
                ref={meshRef}
                args={[activeGeo, undefined, maxCount]}
                frustumCulled={false}
                onPointerMove={handlePointerMove}
                onPointerOut={handlePointerOut}
            >
                <meshBasicMaterial
                    key={colorMode}
                    vertexColors={colorMode === 'axis'}
                    color="#ffffff"
                />
            </instancedMesh>
            {/* Black edge outlines using instanced rendering — raycast disabled */}
            {edgesGeometry && (
                <lineSegments
                    geometry={edgesGeometry}
                    material={edgeShaderMaterial}
                    raycast={() => null as unknown as void}
                />
            )}
        </group>
    );
}
