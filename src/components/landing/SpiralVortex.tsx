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

    vec2 mouse = uMouse * 0.02;
    float t = uTime;
    float sv = clamp(uScrollVelocity, 0.0, 2.0);
    float vs = uVariant * 0.35;

    // Deep dark base
    vec3 color = vec3(0.018, 0.022, 0.048);

    // ── Single center that auto-orbits slowly ──
    float orbitSpeed = 0.08 + sv * 0.03;
    vec2 center = vec2(
      0.0 + sin(t * orbitSpeed) * 0.06 + mouse.x,
      -0.12 - vs + cos(t * orbitSpeed * 0.7) * 0.04 + mouse.y
    );

    // ── 5 concentric rings with even spacing ──
    float baseRadius = 0.16;
    float spacing = 0.135;

    // Muted deep palette — barely lifted from background
    vec3 colors[5];
    colors[0] = vec3(0.08, 0.22, 0.35);  // deep cyan
    colors[1] = vec3(0.07, 0.20, 0.32);  // dark teal
    colors[2] = vec3(0.12, 0.10, 0.30);  // deep indigo
    colors[3] = vec3(0.12, 0.08, 0.28);  // deep violet
    colors[4] = vec3(0.06, 0.18, 0.30);  // muted blue

    for (int i = 0; i < 5; i++) {
      float fi = float(i);
      float r = baseRadius + spacing * fi;

      // Subtle individual wobble
      vec2 c = center + vec2(
        sin(t * 0.1 + fi * 1.3) * 0.008,
        cos(t * 0.12 + fi * 1.7) * 0.006
      );

      float crisp = ring(p, c, r, 0.0018);
      float glow  = ringGlow(p, c, r, 60.0);
      float glow2 = ringGlow(p, c, r, 12.0);

      // Outer rings dimmer
      float brightness = 0.6 - fi * 0.06;

      vec3 col = colors[i];
      color += col * crisp * 0.5 * brightness;
      color += col * glow * 0.2 * brightness;
      color += col * glow2 * 0.06 * brightness;
    }

    // ── Very subtle center ambient glow ──
    float cDist = length(p - vec2(mouse.x * 0.08, -0.1 - vs * 0.5 + mouse.y * 0.08));
    color += vec3(0.10, 0.06, 0.18) * exp(-cDist * 2.5) * 0.08;

    // ── Center text readability zone — dim rings near center ──
    float textZone = smoothstep(0.15, 0.45, length(p - vec2(0.0, 0.0)));
    color *= 0.4 + textZone * 0.6;

    // ── Soft vignette ──
    float vig = 1.0 - smoothstep(0.35, 1.1, length(p) * 0.85);
    color *= 0.5 + vig * 0.5;

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
