// ─────────────────────────────────────────────────
// SpiralVortex — Interactive WebGL background
// ─────────────────────────────────────────────────
// React Three Fiber + custom GLSL shader.
// Dark-toned spiral vortex that responds to mouse.
// ─────────────────────────────────────────────────

import { useRef, useMemo, useCallback } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

// ── GLSL Shaders ──

const vertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  precision highp float;

  uniform float uTime;
  uniform vec2 uMouse;
  uniform vec2 uResolution;

  varying vec2 vUv;

  // Simplex-ish noise
  vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec3 permute(vec3 x) { return mod289(((x * 34.0) + 1.0) * x); }

  float snoise(vec2 v) {
    const vec4 C = vec4(0.211324865405187, 0.366025403784439,
                       -0.577350269189626, 0.024390243902439);
    vec2 i  = floor(v + dot(v, C.yy));
    vec2 x0 = v - i + dot(i, C.xx);
    vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
    vec4 x12 = x0.xyxy + C.xxzz;
    x12.xy -= i1;
    i = mod289(i);
    vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0))
           + i.x + vec3(0.0, i1.x, 1.0));
    vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy),
                            dot(x12.zw,x12.zw)), 0.0);
    m = m * m; m = m * m;
    vec3 x = 2.0 * fract(p * C.www) - 1.0;
    vec3 h = abs(x) - 0.5;
    vec3 ox = floor(x + 0.5);
    vec3 a0 = x - ox;
    m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);
    vec3 g;
    g.x = a0.x * x0.x + h.x * x0.y;
    g.yz = a0.yz * x12.xz + h.yz * x12.yw;
    return 130.0 * dot(m, g);
  }

  void main() {
    vec2 uv = vUv;
    vec2 center = vec2(0.5) + uMouse * 0.05;
    vec2 p = uv - center;

    // Aspect correction
    float aspect = uResolution.x / uResolution.y;
    p.x *= aspect;

    // Polar coordinates
    float r = length(p);
    float a = atan(p.y, p.x);

    // Spiral distortion — mouse influences rotation speed
    float mouseInfluence = length(uMouse) * 0.3;
    float spiral = a + r * 6.0 - uTime * (0.4 + mouseInfluence * 0.15);
    float twist = sin(spiral) * 0.5 + 0.5;

    // Layered noise for organic feel
    float n1 = snoise(vec2(spiral * 0.5, r * 3.0 - uTime * 0.1));
    float n2 = snoise(vec2(a * 2.0 + uTime * 0.05, r * 5.0));
    float n3 = snoise(vec2(p * 4.0 + uTime * 0.08));

    float pattern = twist * 0.6 + n1 * 0.25 + n2 * 0.1 + n3 * 0.05;

    // Radial falloff — vortex fades at edges
    float falloff = smoothstep(0.9, 0.1, r);
    pattern *= falloff;

    // Color palette — deep indigo / violet / slate
    vec3 col1 = vec3(0.08, 0.06, 0.18);  // deep navy
    vec3 col2 = vec3(0.15, 0.10, 0.30);  // indigo
    vec3 col3 = vec3(0.30, 0.20, 0.50);  // violet highlight
    vec3 col4 = vec3(0.05, 0.04, 0.10);  // near-black

    vec3 color = mix(col4, col1, pattern);
    color = mix(color, col2, smoothstep(0.3, 0.7, pattern));
    color = mix(color, col3, smoothstep(0.65, 0.95, pattern) * 0.4);

    // Subtle glow at center
    float glow = exp(-r * 3.0) * 0.15;
    color += vec3(0.25, 0.15, 0.45) * glow;

    // Very subtle mouse proximity highlight
    vec2 mp = uv - (vec2(0.5) + uMouse * 0.5);
    mp.x *= aspect;
    float mouseDist = length(mp);
    float mouseGlow = exp(-mouseDist * 4.0) * 0.06;
    color += vec3(0.3, 0.2, 0.5) * mouseGlow;

    gl_FragColor = vec4(color, 1.0);
  }
`;

// ── Fullscreen Shader Mesh ──

function VortexMesh() {
    const meshRef = useRef<THREE.Mesh>(null);
    const mouseRef = useRef({ x: 0, y: 0 });
    const { size } = useThree();

    const uniforms = useMemo(() => ({
        uTime: { value: 0 },
        uMouse: { value: new THREE.Vector2(0, 0) },
        uResolution: { value: new THREE.Vector2(size.width, size.height) },
    }), []);

    // Smooth mouse tracking
    useFrame(({ clock }) => {
        const mat = meshRef.current?.material as THREE.ShaderMaterial | undefined;
        if (!mat?.uniforms?.uTime || !mat.uniforms.uMouse || !mat.uniforms.uResolution) return;

        mat.uniforms.uTime.value = clock.getElapsedTime();
        mat.uniforms.uResolution.value.set(size.width, size.height);

        // Lerp mouse for smooth movement
        const target = mouseRef.current;
        const current = mat.uniforms.uMouse.value;
        current.x += (target.x - current.x) * 0.03;
        current.y += (target.y - current.y) * 0.03;
    });

    // Track mouse globally (not just over canvas)
    const handleMouseMove = useCallback((e: MouseEvent) => {
        mouseRef.current.x = (e.clientX / window.innerWidth) * 2 - 1;
        mouseRef.current.y = -(e.clientY / window.innerHeight) * 2 + 1;
    }, []);

    // Attach global listener
    useMemo(() => {
        if (typeof window !== 'undefined') {
            window.addEventListener('mousemove', handleMouseMove);
        }
        return () => window.removeEventListener('mousemove', handleMouseMove);
    }, [handleMouseMove]);

    return (
        <mesh ref={meshRef}>
            <planeGeometry args={[2, 2]} />
            <shaderMaterial
                vertexShader={vertexShader}
                fragmentShader={fragmentShader}
                uniforms={uniforms}
                depthWrite={false}
            />
        </mesh>
    );
}

// ── Exported Component ──

export function SpiralVortex() {
    return (
        <div style={{
            position: 'absolute',
            inset: 0,
            zIndex: 0,
            pointerEvents: 'none',
        }}>
            <Canvas
                style={{ width: '100%', height: '100%' }}
                gl={{
                    antialias: false,
                    alpha: false,
                    powerPreference: 'high-performance',
                }}
                dpr={Math.min(window.devicePixelRatio, 1.5)}
                camera={{ position: [0, 0, 1] }}
            >
                <VortexMesh />
            </Canvas>
        </div>
    );
}
