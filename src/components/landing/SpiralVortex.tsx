// ─────────────────────────────────────────────────
// SpiralVortex — Interactive WebGL background
// ─────────────────────────────────────────────────
// React Three Fiber + custom GLSL shader.
// Dark-toned spiral vortex that responds to mouse + scroll velocity.
// ─────────────────────────────────────────────────

import { useRef, useMemo, useCallback, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

// ── Global scroll velocity (written by LandingPage, read by shader) ──
let _scrollVelocity = 0;
export function setScrollVelocity(v: number) { _scrollVelocity = v; }

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
  uniform float uScrollVelocity;

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

    float aspect = uResolution.x / uResolution.y;
    p.x *= aspect;

    float r = length(p);
    float a = atan(p.y, p.x);

    // Scroll velocity accelerates rotation (clamped 0..3)
    float scrollBoost = clamp(uScrollVelocity, 0.0, 3.0);
    float mouseInfluence = length(uMouse) * 0.3;
    float baseSpeed = 0.4 + mouseInfluence * 0.15 + scrollBoost * 0.6;
    float spiral = a + r * 6.0 - uTime * baseSpeed;
    float twist = sin(spiral) * 0.5 + 0.5;

    // Layered noise — scroll velocity adds turbulence
    float turbulence = 1.0 + scrollBoost * 0.3;
    float n1 = snoise(vec2(spiral * 0.5, r * 3.0 - uTime * 0.1 * turbulence));
    float n2 = snoise(vec2(a * 2.0 + uTime * 0.05, r * 5.0));
    float n3 = snoise(vec2(p * 4.0 + uTime * 0.08 * turbulence));

    float pattern = twist * 0.6 + n1 * 0.25 + n2 * 0.1 + n3 * 0.05;

    // Radial falloff
    float falloff = smoothstep(0.9, 0.1, r);
    pattern *= falloff;

    // Color palette — scroll adds slight brightness
    float brightBoost = scrollBoost * 0.04;
    vec3 col1 = vec3(0.08, 0.06, 0.18) + brightBoost;
    vec3 col2 = vec3(0.15, 0.10, 0.30) + brightBoost;
    vec3 col3 = vec3(0.30, 0.20, 0.50);
    vec3 col4 = vec3(0.05, 0.04, 0.10);

    vec3 color = mix(col4, col1, pattern);
    color = mix(color, col2, smoothstep(0.3, 0.7, pattern));
    color = mix(color, col3, smoothstep(0.65, 0.95, pattern) * 0.4);

    // Center glow
    float glow = exp(-r * 3.0) * (0.15 + scrollBoost * 0.05);
    color += vec3(0.25, 0.15, 0.45) * glow;

    // Mouse proximity highlight
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
    const scrollVelSmooth = useRef(0);
    const { size } = useThree();

    const uniforms = useMemo(() => ({
        uTime: { value: 0 },
        uMouse: { value: new THREE.Vector2(0, 0) },
        uResolution: { value: new THREE.Vector2(size.width, size.height) },
        uScrollVelocity: { value: 0 },
    }), []);

    useFrame(({ clock }) => {
        const mat = meshRef.current?.material as THREE.ShaderMaterial | undefined;
        if (!mat?.uniforms?.uTime || !mat.uniforms.uMouse || !mat.uniforms.uResolution) return;

        mat.uniforms.uTime.value = clock.getElapsedTime();
        mat.uniforms.uResolution.value.set(size.width, size.height);

        // Smooth scroll velocity
        scrollVelSmooth.current += (_scrollVelocity - scrollVelSmooth.current) * 0.08;
        mat.uniforms.uScrollVelocity.value = scrollVelSmooth.current;

        // Lerp mouse
        const target = mouseRef.current;
        const current = mat.uniforms.uMouse.value;
        current.x += (target.x - current.x) * 0.03;
        current.y += (target.y - current.y) * 0.03;
    });

    const handleMouseMove = useCallback((e: MouseEvent) => {
        mouseRef.current.x = (e.clientX / window.innerWidth) * 2 - 1;
        mouseRef.current.y = -(e.clientY / window.innerHeight) * 2 + 1;
    }, []);

    useEffect(() => {
        window.addEventListener('mousemove', handleMouseMove);
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
