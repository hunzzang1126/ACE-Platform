// ─────────────────────────────────────────────────
// SpiralVortex — Orbital Rings Background (WebGL)
// ─────────────────────────────────────────────────
// Large glowing full circles with analytical anti-aliasing (fwidth).
// Slow, elegant mouse parallax + scroll velocity response.
// ─────────────────────────────────────────────────

import { useRef, useMemo, useCallback, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

// ── Global scroll velocity (written by LandingPage, read by shader) ──
let _scrollVelocity = 0;
export function setScrollVelocity(v: number) { _scrollVelocity = v; }

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
  uniform float uVariant;

  varying vec2 vUv;

  // ── Analytical AA ring using fwidth ──
  // Returns a smooth ring with pixel-perfect edges, no staircase
  float ring(vec2 p, vec2 center, float radius, float lineWidth) {
    float d = length(p - center) - radius;
    float fw = fwidth(d);                          // pixel size in SDF space
    float edge = smoothstep(lineWidth + fw, lineWidth - fw, abs(d));
    return edge;
  }

  // Soft glow around a ring (exponential falloff)
  float ringGlow(vec2 p, vec2 center, float radius, float spread) {
    float d = abs(length(p - center) - radius);
    return exp(-d * d * spread);
  }

  void main() {
    vec2 uv = vUv;
    float aspect = uResolution.x / uResolution.y;
    vec2 p = uv - 0.5;
    p.x *= aspect;

    vec2 mouse = uMouse * 0.025;
    float t = uTime * 0.12;
    float sv = clamp(uScrollVelocity, 0.0, 2.0);
    float vs = uVariant * 0.35;

    // Deep dark base
    vec3 color = vec3(0.02, 0.025, 0.055);

    // ── Ring 1 — Large outer (teal-cyan) ──
    {
      float r = 0.72 + vs * 0.08;
      vec2 c = vec2(0.04 + mouse.x, -0.18 - vs + mouse.y);
      float angle = t * 0.25 + sv * 0.08;
      c += vec2(cos(angle), sin(angle)) * 0.015;

      float crisp = ring(p, c, r, 0.0025);
      float glow  = ringGlow(p, c, r, 40.0);
      float glow2 = ringGlow(p, c, r, 8.0);

      vec3 teal = vec3(0.10, 0.35, 0.55);
      color += teal * crisp * 0.9;
      color += teal * glow * 0.4;
      color += teal * glow2 * 0.15;
    }

    // ── Ring 2 — Mid (indigo-purple) ──
    {
      float r = 0.52 + vs * 0.06;
      vec2 c = vec2(-0.03 + mouse.x * 0.8, -0.12 - vs * 0.8 + mouse.y * 0.8);
      float angle = t * 0.2 + 1.2;
      c += vec2(cos(angle + 1.0), sin(angle + 1.0)) * 0.012;

      float crisp = ring(p, c, r, 0.003);
      float glow  = ringGlow(p, c, r, 35.0);
      float glow2 = ringGlow(p, c, r, 7.0);

      vec3 indigo = vec3(0.22, 0.14, 0.50);
      color += indigo * crisp * 0.85;
      color += indigo * glow * 0.35;
      color += indigo * glow2 * 0.12;
    }

    // ── Ring 3 — Inner (cyan) ──
    {
      float r = 0.36 + vs * 0.05;
      vec2 c = vec2(0.06 + mouse.x * 0.6, -0.06 - vs * 0.6 + mouse.y * 0.6);
      float angle = t * 0.3 + 2.5 + sv * 0.1;
      c += vec2(cos(angle + 2.5), sin(angle + 2.5)) * 0.01;

      float crisp = ring(p, c, r, 0.002);
      float glow  = ringGlow(p, c, r, 50.0);
      float glow2 = ringGlow(p, c, r, 10.0);

      vec3 cyan = vec3(0.12, 0.35, 0.48);
      color += cyan * crisp * 0.8;
      color += cyan * glow * 0.3;
      color += cyan * glow2 * 0.1;
    }

    // ── Ring 4 — Accent (pale violet, larger) ──
    {
      float r = 0.60 + vs * 0.1;
      vec2 c = vec2(-0.08 + mouse.x * 0.5, 0.04 - vs * 0.5 + mouse.y * 0.5);
      float angle = t * 0.18 + 3.8;
      c += vec2(cos(angle + 4.0), sin(angle + 4.0)) * 0.014;

      float crisp = ring(p, c, r, 0.002);
      float glow  = ringGlow(p, c, r, 30.0);
      float glow2 = ringGlow(p, c, r, 6.0);

      vec3 violet = vec3(0.18, 0.12, 0.40);
      color += violet * crisp * 0.7;
      color += violet * glow * 0.25;
      color += violet * glow2 * 0.10;
    }

    // ── Ring 5 — Small inner bright ring ──
    {
      float r = 0.20 + vs * 0.03;
      vec2 c = vec2(0.02 + mouse.x * 0.4, 0.02 - vs * 0.4 + mouse.y * 0.4);
      float angle = t * 0.35 + 5.5;
      c += vec2(cos(angle), sin(angle)) * 0.008;

      float crisp = ring(p, c, r, 0.0018);
      float glow  = ringGlow(p, c, r, 60.0);

      vec3 brightCyan = vec3(0.15, 0.40, 0.55);
      color += brightCyan * crisp * 0.75;
      color += brightCyan * glow * 0.25;
    }

    // ── Center ambient glow ──
    float cDist = length(p - vec2(mouse.x * 0.1, -0.1 - vs * 0.5 + mouse.y * 0.1));
    color += vec3(0.18, 0.10, 0.32) * exp(-cDist * 2.0) * 0.15;

    // ── Soft vignette ──
    float vig = 1.0 - smoothstep(0.35, 1.1, length(p) * 0.85);
    color *= 0.55 + vig * 0.45;

    gl_FragColor = vec4(color, 1.0);
  }
`;

// ── Fullscreen Shader Mesh ──

interface VortexMeshProps { variant?: number; }

function VortexMesh({ variant = 0 }: VortexMeshProps) {
    const meshRef = useRef<THREE.Mesh>(null);
    const mouseRef = useRef({ x: 0, y: 0 });
    const scrollVelSmooth = useRef(0);
    const { size } = useThree();

    const uniforms = useMemo(() => ({
        uTime: { value: 0 },
        uMouse: { value: new THREE.Vector2(0, 0) },
        uResolution: { value: new THREE.Vector2(size.width, size.height) },
        uScrollVelocity: { value: 0 },
        uVariant: { value: variant },
    }), []);

    useFrame(({ clock }) => {
        const mat = meshRef.current?.material as THREE.ShaderMaterial | undefined;
        if (!mat?.uniforms) return;
        const u = mat.uniforms;
        if (!u.uTime || !u.uResolution || !u.uScrollVelocity || !u.uMouse) return;

        u.uTime.value = clock.getElapsedTime();
        u.uResolution.value.set(size.width, size.height);

        scrollVelSmooth.current += (_scrollVelocity - scrollVelSmooth.current) * 0.05;
        u.uScrollVelocity.value = scrollVelSmooth.current;

        // Very slow mouse lerp
        const target = mouseRef.current;
        const current = u.uMouse.value;
        current.x += (target.x - current.x) * 0.015;
        current.y += (target.y - current.y) * 0.015;
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

// ── Exported Components ──

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
                    antialias: true,
                    alpha: false,
                    powerPreference: 'high-performance',
                }}
                dpr={window.devicePixelRatio}
                camera={{ position: [0, 0, 1] }}
            >
                <VortexMesh variant={0} />
            </Canvas>
        </div>
    );
}

export function OrbitalAccent() {
    return (
        <div style={{
            position: 'relative',
            width: '100%',
            height: '500px',
            marginTop: '-100px',
            marginBottom: '-100px',
            zIndex: 0,
            pointerEvents: 'none',
        }}>
            <Canvas
                style={{ width: '100%', height: '100%' }}
                gl={{
                    antialias: true,
                    alpha: true,
                    powerPreference: 'high-performance',
                }}
                dpr={window.devicePixelRatio}
                camera={{ position: [0, 0, 1] }}
            >
                <VortexMesh variant={1} />
            </Canvas>
        </div>
    );
}
