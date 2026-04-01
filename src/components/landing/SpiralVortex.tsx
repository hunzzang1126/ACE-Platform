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

  // Hash for pseudo-random (particles)
  float hash(float n) { return fract(sin(n) * 43758.5453123); }
  float hash2(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }

  // Traveling light dot on a ring path
  float ringDot(vec2 p, vec2 center, float radius, float angle, float size) {
    vec2 dotPos = center + vec2(cos(angle), sin(angle)) * radius;
    float d = length(p - dotPos);
    return exp(-d * d / (size * size));
  }

  void main() {
    vec2 uv = vUv;
    float aspect = uResolution.x / uResolution.y;
    vec2 p = uv - 0.5;
    p.x *= aspect;

    vec2 mouse = uMouse * 0.025;
    float t = uTime;
    float sv = clamp(uScrollVelocity, 0.0, 2.0);
    float vs = uVariant * 0.35;

    // Deep dark base
    vec3 color = vec3(0.02, 0.025, 0.055);

    // ── Center positioned BELOW viewport center ──
    // This naturally keeps text area clear while rings stay bright
    float orbitSpeed = 0.08 + sv * 0.03;
    vec2 center = vec2(
      0.0 + sin(t * orbitSpeed) * 0.08 + mouse.x,
      -0.35 - vs + cos(t * orbitSpeed * 0.7) * 0.06 + mouse.y
    );

    // ── 5 concentric rings with even spacing ──
    float baseRadius = 0.18;
    float spacing = 0.14;

    // Vibrant palette
    vec3 colors[5];
    colors[0] = vec3(0.14, 0.40, 0.55);  // bright cyan
    colors[1] = vec3(0.11, 0.34, 0.50);  // teal
    colors[2] = vec3(0.16, 0.18, 0.48);  // indigo
    colors[3] = vec3(0.18, 0.12, 0.42);  // violet
    colors[4] = vec3(0.09, 0.28, 0.48);  // teal-blue

    for (int i = 0; i < 5; i++) {
      float fi = float(i);

      // ── Breathing / pulsing radius — each ring breathes at different phase ──
      float breathSpeed = 0.15 + fi * 0.03;
      float breathAmp = 0.012 + fi * 0.005;
      float breath = sin(t * breathSpeed + fi * 1.2) * breathAmp;
      float r = baseRadius + spacing * fi + breath;

      // Subtle individual wobble (wider orbit for dynamic feel)
      vec2 c = center + vec2(
        sin(t * 0.12 + fi * 1.5) * (0.015 + fi * 0.005),
        cos(t * 0.10 + fi * 1.9) * (0.012 + fi * 0.004)
      );

      float crisp = ring(p, c, r, 0.002);
      float glow  = ringGlow(p, c, r, 45.0);
      float glow2 = ringGlow(p, c, r, 8.0);

      // Outer rings slightly dimmer
      float brightness = 1.0 - fi * 0.08;

      vec3 col = colors[i];
      color += col * crisp * 0.8 * brightness;
      color += col * glow * 0.32 * brightness;
      color += col * glow2 * 0.12 * brightness;
    }

    // ── Traveling light dots on each ring ──
    // Variant dims these for mid-page subtlety
    float dotBright = 1.0 - uVariant * 0.6;
    for (int i = 0; i < 5; i++) {
      float fi = float(i);
      float r = baseRadius + spacing * fi;
      vec2 c = center;

      // 2 dots per ring, different speeds
      float speed1 = 0.2 + fi * 0.05;
      float speed2 = 0.15 + fi * 0.04;
      float angle1 = t * speed1 + fi * 1.3;
      float angle2 = t * speed2 + fi * 2.7 + 3.14159;

      float dot1 = ringDot(p, c, r, angle1, 0.012);
      float dot2 = ringDot(p, c, r, angle2, 0.009);

      vec3 dotCol = vec3(0.25, 0.55, 0.75);
      color += dotCol * dot1 * 0.5 * dotBright;
      color += dotCol * dot2 * 0.3 * dotBright;
    }

    // ── Floating micro particles (cosmic dust) ──
    for (int i = 0; i < 12; i++) {
      float fi = float(i);
      float px = hash(fi * 13.7) * aspect * 2.0 - aspect;
      float py = hash(fi * 17.3) * 2.0 - 1.0;
      // Slow drift
      px += sin(t * 0.05 + fi * 2.1) * 0.04;
      py += cos(t * 0.04 + fi * 1.8) * 0.03;
      float pd = length(p - vec2(px, py));
      float sparkle = exp(-pd * pd * 800.0) * (0.3 + 0.2 * sin(t * 0.3 + fi * 5.0));
      color += vec3(0.20, 0.35, 0.50) * sparkle * (1.0 - uVariant * 0.5);
    }

    // ── Ambient center glow (follows ring center) ──
    float cDist = length(p - center);
    color += vec3(0.14, 0.08, 0.28) * exp(-cDist * 2.0) * 0.12;

    // ── Variant dimming for mid-page accent ──
    float variantDim = 1.0 - uVariant * 0.35;
    color *= variantDim;

    // ── Soft vignette ──
    float vig = 1.0 - smoothstep(0.4, 1.2, length(p) * 0.85);
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
            position: 'absolute',
            inset: 0,
            zIndex: 0,
            pointerEvents: 'none',
            opacity: 0.7,
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
