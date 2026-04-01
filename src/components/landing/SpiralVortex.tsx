// ─────────────────────────────────────────────────
// SpiralVortex — Orbital Arcs Background (WebGL)
// ─────────────────────────────────────────────────
// Large glowing orbital circles inspired by Frame.io / Apple style.
// Slow, elegant mouse parallax. Responds to scroll velocity.
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
  uniform float uVariant; // 0.0 = hero, 1.0 = mid-page

  varying vec2 vUv;

  // Draw a single glowing arc (partial circle)
  float arc(vec2 p, vec2 center, float radius, float thickness, float glow) {
    float d = abs(length(p - center) - radius);
    float core = smoothstep(thickness, 0.0, d);
    float halo = exp(-d * glow);
    return core * 0.6 + halo * 0.4;
  }

  void main() {
    vec2 uv = vUv;
    float aspect = uResolution.x / uResolution.y;
    vec2 p = uv - 0.5;
    p.x *= aspect;

    // Slow mouse influence
    vec2 mouse = uMouse * 0.02;
    float t = uTime * 0.15;
    float scrollBoost = clamp(uScrollVelocity, 0.0, 2.0);

    // Dark base
    vec3 color = vec3(0.024, 0.031, 0.059);

    // ── Define orbital arcs ──
    // Each arc: center offset, radius, thickness, glow, color, rotation speed

    // Variant shifts the composition
    float vShift = uVariant * 0.3;

    // Arc 1 — Large outer arc (teal-blue)
    {
      float r = 0.65 + vShift * 0.1;
      vec2 c = vec2(0.05 + mouse.x, -0.15 - vShift + mouse.y);
      float angle = t * 0.3 + scrollBoost * 0.1;
      c += vec2(cos(angle), sin(angle)) * 0.02;
      float a = arc(p, c, r, 0.003, 6.0);
      // Mask to show ~70% of the circle
      float maskAngle = atan(p.y - c.y, p.x - c.x) + angle * 0.5;
      a *= smoothstep(-0.3, 0.5, sin(maskAngle * 0.5 + 0.5));
      color += vec3(0.08, 0.25, 0.45) * a * 1.2;
    }

    // Arc 2 — Mid arc (indigo-purple)
    {
      float r = 0.48 + vShift * 0.08;
      vec2 c = vec2(-0.02 + mouse.x * 0.8, -0.08 - vShift * 0.8 + mouse.y * 0.8);
      float angle = t * 0.25 + 1.0;
      c += vec2(cos(angle + 1.0), sin(angle + 1.0)) * 0.015;
      float a = arc(p, c, r, 0.004, 8.0);
      float maskAngle = atan(p.y - c.y, p.x - c.x) + angle * 0.4;
      a *= smoothstep(-0.2, 0.6, sin(maskAngle * 0.5 + 1.2));
      color += vec3(0.18, 0.12, 0.40) * a * 1.1;
    }

    // Arc 3 — Inner arc (cyan shimmer)
    {
      float r = 0.32 + vShift * 0.06;
      vec2 c = vec2(0.08 + mouse.x * 0.6, -0.05 - vShift * 0.6 + mouse.y * 0.6);
      float angle = t * 0.35 + 2.0 + scrollBoost * 0.15;
      c += vec2(cos(angle + 2.5), sin(angle + 2.5)) * 0.01;
      float a = arc(p, c, r, 0.003, 10.0);
      float maskAngle = atan(p.y - c.y, p.x - c.x) + angle * 0.3;
      a *= smoothstep(-0.4, 0.5, sin(maskAngle * 0.5 + 2.0));
      color += vec3(0.10, 0.30, 0.42) * a * 0.9;
    }

    // Arc 4 — Subtle accent (pale violet)
    {
      float r = 0.55 + vShift * 0.12;
      vec2 c = vec2(-0.1 + mouse.x * 0.5, 0.05 - vShift * 0.5 + mouse.y * 0.5);
      float angle = t * 0.2 + 3.5;
      c += vec2(cos(angle + 4.0), sin(angle + 4.0)) * 0.018;
      float a = arc(p, c, r, 0.002, 5.0);
      float maskAngle = atan(p.y - c.y, p.x - c.x) + angle * 0.6;
      a *= smoothstep(-0.1, 0.7, sin(maskAngle * 0.5 + 3.0));
      color += vec3(0.15, 0.10, 0.35) * a * 0.7;
    }

    // Arc 5 — Tiny inner glow ring
    {
      float r = 0.18 + vShift * 0.04;
      vec2 c = vec2(0.03 + mouse.x * 0.4, 0.0 - vShift * 0.4 + mouse.y * 0.4);
      float angle = t * 0.4 + 5.0;
      c += vec2(cos(angle), sin(angle)) * 0.008;
      float a = arc(p, c, r, 0.002, 12.0);
      color += vec3(0.12, 0.22, 0.38) * a * 0.6;
    }

    // Center ambient glow
    float centerDist = length(p - vec2(mouse.x * 0.1, -0.1 - vShift * 0.5 + mouse.y * 0.1));
    float ambientGlow = exp(-centerDist * 2.5) * 0.12;
    color += vec3(0.20, 0.12, 0.35) * ambientGlow;

    // Subtle vignette
    float vignette = 1.0 - smoothstep(0.4, 1.0, length(p) * 0.9);
    color *= 0.6 + vignette * 0.4;

    gl_FragColor = vec4(color, 1.0);
  }
`;

// ── Fullscreen Shader Mesh ──

interface VortexMeshProps {
    variant?: number; // 0 = hero, 1 = mid-page
}

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

        // Smooth scroll velocity
        scrollVelSmooth.current += (_scrollVelocity - scrollVelSmooth.current) * 0.05;
        u.uScrollVelocity.value = scrollVelSmooth.current;

        // Very slow mouse lerp — elegant, not jittery
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

/** Hero background — orbital arcs centered above hero text */
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
                <VortexMesh variant={0} />
            </Canvas>
        </div>
    );
}

/** Mid-page orbital accent — placed between sections for visual continuity */
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
                    antialias: false,
                    alpha: true,
                    powerPreference: 'high-performance',
                }}
                dpr={Math.min(window.devicePixelRatio, 1.5)}
                camera={{ position: [0, 0, 1] }}
            >
                <VortexMesh variant={1} />
            </Canvas>
        </div>
    );
}
