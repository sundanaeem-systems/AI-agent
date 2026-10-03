/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Cinematic Artificial Neural Network Core Background
 * Features:
 * - 8K Neural Network Core with vibrant glowing nucleus (electric blue & purple energy)
 * - Translucent spherical cage structure with geometric facets and glowing vertex data points
 * - Dark, web-like neural pathways and filaments fanning out into the dark void
 * - Floating 3D holographic mathematical symbols (Σ, ∞, α, ε, ∇, λ, ∫) with depth of field
 * - Hexagonal data clusters and abstract crystalline polyhedra
 * - Faint streams of glowing code, hex addresses, and equations
 * - Action-potential neural pulses traveling outward from the nucleus
 * - Smooth cinematic camera drift and parallax motion
 */

import React, { useEffect, useRef, useState } from 'react';
import { Sparkles, Play, Pause, Cpu, Layers } from 'lucide-react';

const NEURAL_NETWORK_CORE_IMAGE = '/src/assets/images/neural_network_core_new_1790334099477.jpg';

export type CosmicThemeMode = 'merged' | 'city_noir' | 'hybrid' | 'nebula' | 'ai_network';

interface CosmicBackgroundProps {
  initialMode?: CosmicThemeMode;
  showAtmosphereButton?: boolean;
}

interface MathSymbol3D {
  char: string;
  xRatio: number;
  yRatio: number;
  depth: number; // 0.3 to 0.95
  baseSize: number;
  rot: number;
  rotSpeed: number;
  floatSpeed: number;
  floatPhase: number;
  color: 'cyan' | 'purple' | 'violet';
}

interface CodeFragment {
  text: string;
  xRatio: number;
  yRatio: number;
  speedY: number;
  depth: number;
  alpha: number;
  pulsePhase: number;
}

interface NeuralCorePulse {
  angle: number;
  distance: number;
  maxDistance: number;
  speed: number;
  hue: number;
  size: number;
}

interface HexCluster {
  xRatio: number;
  yRatio: number;
  depth: number;
  radius: number;
  rot: number;
  rotSpeed: number;
  floatPhase: number;
  color: 'cyan' | 'purple';
}

interface CrystalShape {
  type: 'octahedron' | 'icosahedron' | 'cube';
  xRatio: number;
  yRatio: number;
  depth: number;
  scale: number;
  rotX: number;
  rotY: number;
  rotZ: number;
  speedRotX: number;
  speedRotY: number;
  speedRotZ: number;
  floatSpeed: number;
  floatPhase: number;
  color: 'cyan' | 'purple';
}

interface QuantumSpeck {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  radius: number;
  hue: number;
  alpha: number;
  pulsePhase: number;
  pulseSpeed: number;
}

export const CosmicBackground: React.FC<CosmicBackgroundProps> = ({
  showAtmosphereButton = false,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [speedMultiplier, setSpeedMultiplier] = useState<number>(0.65); // cinematic slow motion
  const [enable3DObjects, setEnable3DObjects] = useState<boolean>(true);
  const [enableCodeStreams, setEnableCodeStreams] = useState<boolean>(true);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [controlsOpen, setControlsOpen] = useState<boolean>(false);

  // Parallax tracking
  const mouseRef = useRef({ x: 0.5, y: 0.5, targetX: 0.5, targetY: 0.5 });
  const cameraRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    // 1. Holographic Mathematical Symbols (Σ, ∞, α, etc.)
    const mathSymbols: MathSymbol3D[] = [
      { char: 'Σ', xRatio: 0.16, yRatio: 0.22, depth: 0.9, baseSize: 36, rot: 0.1, rotSpeed: 0.002, floatSpeed: 0.7, floatPhase: 0.2, color: 'cyan' },
      { char: '∞', xRatio: 0.26, yRatio: 0.16, depth: 0.78, baseSize: 32, rot: -0.15, rotSpeed: 0.0015, floatSpeed: 0.6, floatPhase: 1.8, color: 'purple' },
      { char: 'α', xRatio: 0.78, yRatio: 0.65, depth: 0.85, baseSize: 30, rot: 0.2, rotSpeed: 0.0022, floatSpeed: 0.8, floatPhase: 3.1, color: 'cyan' },
      { char: '∞', xRatio: 0.74, yRatio: 0.15, depth: 0.68, baseSize: 30, rot: 0.12, rotSpeed: 0.0018, floatSpeed: 0.65, floatPhase: 4.4, color: 'violet' },
      { char: 'ε', xRatio: 0.88, yRatio: 0.28, depth: 0.92, baseSize: 34, rot: -0.1, rotSpeed: 0.0024, floatSpeed: 0.75, floatPhase: 0.9, color: 'purple' },
      { char: '∞', xRatio: 0.22, yRatio: 0.82, depth: 0.88, baseSize: 36, rot: 0.08, rotSpeed: 0.0012, floatSpeed: 0.85, floatPhase: 2.5, color: 'cyan' },
      { char: '∞', xRatio: 0.85, yRatio: 0.82, depth: 0.75, baseSize: 32, rot: -0.2, rotSpeed: 0.0019, floatSpeed: 0.7, floatPhase: 5.2, color: 'purple' },
      { char: '∇', xRatio: 0.12, yRatio: 0.55, depth: 0.58, baseSize: 26, rot: 0.05, rotSpeed: 0.0016, floatSpeed: 0.6, floatPhase: 3.8, color: 'cyan' },
      { char: 'λ', xRatio: 0.64, yRatio: 0.82, depth: 0.52, baseSize: 24, rot: -0.08, rotSpeed: 0.002, floatSpeed: 0.9, floatPhase: 1.4, color: 'violet' },
      { char: '∫', xRatio: 0.36, yRatio: 0.25, depth: 0.52, baseSize: 28, rot: 0.15, rotSpeed: 0.0014, floatSpeed: 0.65, floatPhase: 4.0, color: 'purple' },
      { char: 'Ω', xRatio: 0.62, yRatio: 0.18, depth: 0.62, baseSize: 26, rot: -0.12, rotSpeed: 0.0018, floatSpeed: 0.72, floatPhase: 2.8, color: 'cyan' },
    ];

    // 2. Faint Streams of Glowing Code & Equations
    const codeFragments: CodeFragment[] = [
      { text: 'Σ(wᵢ·xᵢ)+b', xRatio: 0.2, yRatio: 0.36, speedY: 0.00015, depth: 0.75, alpha: 0.38, pulsePhase: 0.5 },
      { text: '∂L/∂W_k', xRatio: 0.8, yRatio: 0.45, speedY: 0.00018, depth: 0.8, alpha: 0.35, pulsePhase: 1.8 },
      { text: '0x7F4A9E2B', xRatio: 0.32, yRatio: 0.72, speedY: 0.00012, depth: 0.6, alpha: 0.32, pulsePhase: 3.2 },
      { text: '1011010010', xRatio: 0.68, yRatio: 0.28, speedY: 0.0002, depth: 0.65, alpha: 0.34, pulsePhase: 2.1 },
      { text: 'λ·∇f(x_t)', xRatio: 0.14, yRatio: 0.78, speedY: 0.00016, depth: 0.7, alpha: 0.3, pulsePhase: 4.5 },
      { text: 'e^{iπ}+1=0', xRatio: 0.84, yRatio: 0.74, speedY: 0.00014, depth: 0.62, alpha: 0.28, pulsePhase: 0.9 },
      { text: 'H(X|Y)→min', xRatio: 0.55, yRatio: 0.84, speedY: 0.00017, depth: 0.55, alpha: 0.3, pulsePhase: 5.1 },
      { text: 'ReLU(z)=max(0,z)', xRatio: 0.38, yRatio: 0.14, speedY: 0.00015, depth: 0.58, alpha: 0.26, pulsePhase: 1.2 },
    ];

    // 3. Hexagonal Data Clusters
    const hexClusters: HexCluster[] = [
      { xRatio: 0.18, yRatio: 0.38, depth: 0.8, radius: 24, rot: 0.4, rotSpeed: 0.002, floatPhase: 0.4, color: 'cyan' },
      { xRatio: 0.82, yRatio: 0.34, depth: 0.75, radius: 26, rot: -0.2, rotSpeed: 0.0018, floatPhase: 2.2, color: 'purple' },
      { xRatio: 0.3, yRatio: 0.75, depth: 0.6, radius: 20, rot: 0.3, rotSpeed: 0.0022, floatPhase: 3.8, color: 'cyan' },
      { xRatio: 0.72, yRatio: 0.78, depth: 0.65, radius: 22, rot: -0.15, rotSpeed: 0.0015, floatPhase: 5.0, color: 'purple' },
    ];

    // 4. Floating 3D Crystalline Geometries (Octahedron, Icosahedron, Cube)
    const phi = 1.6180339887;
    const GEOM_DEFS = {
      octahedron: {
        vertices: [
          { x: 0, y: 1.1, z: 0 },
          { x: 0, y: -1.1, z: 0 },
          { x: 1.1, y: 0, z: 0 },
          { x: -1.1, y: 0, z: 0 },
          { x: 0, y: 0, z: 1.1 },
          { x: 0, y: 0, z: -1.1 },
        ],
        edges: [
          [0, 2], [0, 3], [0, 4], [0, 5],
          [1, 2], [1, 3], [1, 4], [1, 5],
          [2, 4], [4, 3], [3, 5], [5, 2],
        ],
      },
      icosahedron: {
        vertices: [
          { x: -1, y: phi, z: 0 },
          { x: 1, y: phi, z: 0 },
          { x: -1, y: -phi, z: 0 },
          { x: 1, y: -phi, z: 0 },
          { x: 0, y: -1, z: phi },
          { x: 0, y: 1, z: phi },
          { x: 0, y: -1, z: -phi },
          { x: 0, y: 1, z: -phi },
          { x: phi, y: 0, z: -1 },
          { x: phi, y: 0, z: 1 },
          { x: -phi, y: 0, z: -1 },
          { x: -phi, y: 0, z: 1 },
        ],
        edges: [
          [0, 1], [0, 5], [0, 7], [0, 10], [0, 11],
          [1, 5], [1, 7], [1, 8], [1, 9],
          [2, 3], [2, 4], [2, 6], [2, 10], [2, 11],
          [3, 4], [3, 6], [3, 8], [3, 9],
          [4, 5], [4, 9], [4, 11],
          [5, 9], [5, 11],
          [6, 7], [6, 8], [6, 10],
          [7, 8], [7, 10],
          [8, 9], [10, 11],
        ],
      },
      cube: {
        vertices: [
          { x: -1, y: -1, z: -1 },
          { x: 1, y: -1, z: -1 },
          { x: 1, y: 1, z: -1 },
          { x: -1, y: 1, z: -1 },
          { x: -1, y: -1, z: 1 },
          { x: 1, y: -1, z: 1 },
          { x: 1, y: 1, z: 1 },
          { x: -1, y: 1, z: 1 },
        ],
        edges: [
          [0, 1], [1, 2], [2, 3], [3, 0],
          [4, 5], [5, 6], [6, 7], [7, 4],
          [0, 4], [1, 5], [2, 6], [3, 7],
        ],
      },
    };

    const crystals: CrystalShape[] = [
      { type: 'icosahedron', xRatio: 0.14, yRatio: 0.3, depth: 0.88, scale: 38, rotX: 0.2, rotY: 0.4, rotZ: 0.1, speedRotX: 0.003, speedRotY: 0.005, speedRotZ: 0.002, floatSpeed: 0.8, floatPhase: 0.5, color: 'cyan' },
      { type: 'octahedron', xRatio: 0.86, yRatio: 0.36, depth: 0.82, scale: 42, rotX: 0.4, rotY: 0.3, rotZ: 0.2, speedRotX: 0.004, speedRotY: 0.006, speedRotZ: 0.003, floatSpeed: 0.7, floatPhase: 2.3, color: 'purple' },
      { type: 'cube', xRatio: 0.12, yRatio: 0.7, depth: 0.55, scale: 28, rotX: 0.3, rotY: 0.5, rotZ: 0.4, speedRotX: 0.003, speedRotY: 0.004, speedRotZ: 0.002, floatSpeed: 0.75, floatPhase: 4.1, color: 'cyan' },
      { type: 'icosahedron', xRatio: 0.5, yRatio: 0.15, depth: 0.45, scale: 24, rotX: 0.5, rotY: 0.2, rotZ: 0.3, speedRotX: 0.002, speedRotY: 0.004, speedRotZ: 0.002, floatSpeed: 0.6, floatPhase: 1.1, color: 'purple' },
      { type: 'octahedron', xRatio: 0.4, yRatio: 0.84, depth: 0.62, scale: 32, rotX: 0.2, rotY: 0.6, rotZ: 0.5, speedRotX: 0.0035, speedRotY: 0.004, speedRotZ: 0.0025, floatSpeed: 0.85, floatPhase: 3.5, color: 'cyan' },
    ];

    // 5. Kinetic Outward Neural Pulses
    const neuralPulses: NeuralCorePulse[] = [];
    const maxNeuralPulses = 18;

    // 6. Ambient Quantum Synapse Specks
    const specks: QuantumSpeck[] = [];
    const speckCount = 85;
    for (let i = 0; i < speckCount; i++) {
      const z = 0.2 + Math.random() * 0.8;
      specks.push({
        x: Math.random() * width,
        y: Math.random() * height,
        z,
        vx: (Math.random() - 0.5) * 0.18 * z,
        vy: (Math.random() - 0.5) * 0.18 * z - 0.02 * z,
        radius: (1.2 + Math.random() * 1.8) * z,
        hue: Math.random() > 0.5 ? 185 : 275,
        alpha: 0.25 + Math.random() * 0.5,
        pulsePhase: Math.random() * Math.PI * 2,
        pulseSpeed: 0.015 + Math.random() * 0.025,
      });
    }

    const rotate3DPoint = (
      x: number,
      y: number,
      z: number,
      rx: number,
      ry: number,
      rz: number
    ) => {
      const cx = Math.cos(rx), sx = Math.sin(rx);
      const y1 = y * cx - z * sx;
      const z1 = y * sx + z * cx;

      const cy = Math.cos(ry), sy = Math.sin(ry);
      const x2 = x * cy + z1 * sy;
      const z2 = -x * sy + z1 * cy;

      const cz = Math.cos(rz), sz = Math.sin(rz);
      const x3 = x2 * cz - y1 * sz;
      const y3 = x2 * sz + y1 * cz;

      return { x: x3, y: y3, z: z2 };
    };

    const handleResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current.targetX = e.clientX / window.innerWidth;
      mouseRef.current.targetY = e.clientY / window.innerHeight;
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('mousemove', handleMouseMove, { passive: true });

    let lastTime = performance.now();
    let globalTime = 0;

    const render = (currentTime: number) => {
      const dt = Math.min((currentTime - lastTime) / 1000, 0.1);
      lastTime = currentTime;

      if (!isPaused) {
        globalTime += dt * speedMultiplier;
      }

      // Smooth camera interpolation for interactive parallax
      mouseRef.current.x += (mouseRef.current.targetX - mouseRef.current.x) * 0.04;
      mouseRef.current.y += (mouseRef.current.targetY - mouseRef.current.y) * 0.04;
      cameraRef.current.x = (mouseRef.current.x - 0.5) * 45;
      cameraRef.current.y = (mouseRef.current.y - 0.5) * 35;

      ctx.clearRect(0, 0, width, height);

      // --- LAYER 1: Ambient Quantum Specks (Deep Space Synapse Dust) ---
      ctx.save();
      for (let i = 0; i < specks.length; i++) {
        const sp = specks[i];
        if (!isPaused) {
          sp.x += sp.vx * speedMultiplier;
          sp.y += sp.vy * speedMultiplier;
          if (sp.x < -20) sp.x = width + 20;
          if (sp.x > width + 20) sp.x = -20;
          if (sp.y < -20) sp.y = height + 20;
          if (sp.y > height + 20) sp.y = -20;
        }

        const sx = sp.x + cameraRef.current.x * sp.z;
        const sy = sp.y + cameraRef.current.y * sp.z;
        const pulse = Math.sin(globalTime * 2.5 * sp.pulseSpeed + sp.pulsePhase);
        const a = Math.max(0.1, Math.min(0.85, sp.alpha + pulse * 0.2));

        ctx.fillStyle = `hsla(${sp.hue}, 95%, 70%, ${a})`;
        ctx.beginPath();
        ctx.arc(sx, sy, sp.radius * (0.9 + pulse * 0.2), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();

      // --- LAYER 2: Vibrant Swirling Neural Core & Translucent Spherical Cage ---
      ctx.save();
      const coreCenterX = width * 0.5 + cameraRef.current.x * 0.45;
      const coreCenterY = height * 0.42 + cameraRef.current.y * 0.45;
      const coreBaseRadius = Math.min(width, height) * 0.125;

      // Central Breathing Core Glow
      const corePulse = 1 + 0.07 * Math.sin(globalTime * 2.2);
      const coreGlow = ctx.createRadialGradient(
        coreCenterX,
        coreCenterY,
        0,
        coreCenterX,
        coreCenterY,
        coreBaseRadius * 2.0 * corePulse
      );
      coreGlow.addColorStop(0, 'rgba(255, 255, 255, 0.55)');
      coreGlow.addColorStop(0.18, 'rgba(0, 242, 255, 0.45)');
      coreGlow.addColorStop(0.48, 'rgba(168, 85, 247, 0.28)');
      coreGlow.addColorStop(0.82, 'rgba(56, 189, 248, 0.08)');
      coreGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');

      ctx.fillStyle = coreGlow;
      ctx.beginPath();
      ctx.arc(coreCenterX, coreCenterY, coreBaseRadius * 2.0 * corePulse, 0, Math.PI * 2);
      ctx.fill();

      // Swirling Electric Filaments (Vortex energy motion)
      const filamentCount = 16;
      ctx.lineWidth = 1.4;
      for (let f = 0; f < filamentCount; f++) {
        const fAngle = (f / filamentCount) * Math.PI * 2 + globalTime * (0.4 + (f % 4) * 0.08);
        const fRadius = coreBaseRadius * (0.6 + 0.35 * Math.sin(globalTime * 1.5 + f));
        const color = f % 2 === 0 ? 'rgba(0, 242, 255, 0.72)' : 'rgba(192, 132, 252, 0.72)';

        ctx.strokeStyle = color;
        ctx.shadowColor = f % 2 === 0 ? '#00f2ff' : '#c084fc';
        ctx.shadowBlur = 14;

        ctx.beginPath();
        const startX = coreCenterX + Math.cos(fAngle) * (fRadius * 0.3);
        const startY = coreCenterY + Math.sin(fAngle) * (fRadius * 0.3);
        const cpX = coreCenterX + Math.cos(fAngle + 1.25) * (fRadius * 1.15);
        const cpY = coreCenterY + Math.sin(fAngle + 1.25) * (fRadius * 1.15);
        const endX = coreCenterX + Math.cos(fAngle + 2.5) * (fRadius * 0.9);
        const endY = coreCenterY + Math.sin(fAngle + 2.5) * (fRadius * 0.9);

        ctx.moveTo(startX, startY);
        ctx.quadraticCurveTo(cpX, cpY, endX, endY);
        ctx.stroke();
      }

      // Translucent Spherical Geodesic Cage with Glowing Vertices
      const cagePointsCount = 16;
      const cageRadius = coreBaseRadius * 1.25 * corePulse;
      const cageRotY = globalTime * 0.28;
      const cageRotX = 0.35 + Math.sin(globalTime * 0.2) * 0.25;

      const projectedCageVerts: { x: number; y: number; z: number }[] = [];
      for (let cp = 0; cp < cagePointsCount; cp++) {
        const pPhi = Math.acos(-1 + (2 * cp) / cagePointsCount);
        const pTheta = Math.sqrt(cagePointsCount * Math.PI) * pPhi;

        const x = cageRadius * Math.cos(pTheta) * Math.sin(pPhi);
        const y = cageRadius * Math.sin(pTheta) * Math.sin(pPhi);
        const z = cageRadius * Math.cos(pPhi);

        const rot = rotate3DPoint(x, y, z, cageRotX, cageRotY, 0);
        projectedCageVerts.push({
          x: coreCenterX + rot.x,
          y: coreCenterY + rot.y,
          z: rot.z,
        });
      }

      // Connect Geodesic Cage Edges
      ctx.lineWidth = 0.9;
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.36)';
      ctx.shadowColor = '#00f2ff';
      ctx.shadowBlur = 8;
      for (let cp1 = 0; cp1 < cagePointsCount; cp1++) {
        for (let cp2 = cp1 + 1; cp2 < cagePointsCount; cp2++) {
          const p1 = projectedCageVerts[cp1];
          const p2 = projectedCageVerts[cp2];
          const dx = p1.x - p2.x;
          const dy = p1.y - p2.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < cageRadius * 0.95) {
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
          }
        }
      }

      // Glowing Data Points on Cage Vertices
      for (let cp = 0; cp < cagePointsCount; cp++) {
        const p = projectedCageVerts[cp];
        const pointAlpha = 0.45 + (p.z / cageRadius) * 0.45;
        ctx.fillStyle = cp % 2 === 0 ? `rgba(0, 242, 255, ${pointAlpha})` : `rgba(192, 132, 252, ${pointAlpha})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 2.2, 0, Math.PI * 2);
        ctx.fill();
      }

      // Outward Action-Potential Neural Pulses
      if (!isPaused && Math.random() < 0.14 && neuralPulses.length < maxNeuralPulses) {
        neuralPulses.push({
          angle: Math.random() * Math.PI * 2,
          distance: coreBaseRadius * 0.95,
          maxDistance: coreBaseRadius * (2.8 + Math.random() * 3.8),
          speed: 1.6 + Math.random() * 2.4,
          hue: Math.random() > 0.5 ? 185 : 275,
          size: 1.8 + Math.random() * 2.0,
        });
      }

      for (let npIdx = neuralPulses.length - 1; npIdx >= 0; npIdx--) {
        const pulse = neuralPulses[npIdx];
        if (!isPaused) {
          pulse.distance += pulse.speed * speedMultiplier * 60 * dt;
        }

        if (pulse.distance >= pulse.maxDistance) {
          neuralPulses.splice(npIdx, 1);
          continue;
        }

        const pulseProgress = pulse.distance / pulse.maxDistance;
        const pulseAlpha = Math.sin(pulseProgress * Math.PI) * 0.8;
        const px = coreCenterX + Math.cos(pulse.angle) * pulse.distance;
        const py = coreCenterY + Math.sin(pulse.angle) * pulse.distance;

        ctx.fillStyle = `hsla(${pulse.hue}, 95%, 70%, ${pulseAlpha})`;
        ctx.shadowColor = pulse.hue === 185 ? '#00f2ff' : '#c084fc';
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.arc(px, py, pulse.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();

      // --- LAYER 3: Floating 3D Holographic Math Symbols (Σ, ∞, α, etc.) ---
      if (enable3DObjects) {
        ctx.save();
        for (let mIdx = 0; mIdx < mathSymbols.length; mIdx++) {
          const sym = mathSymbols[mIdx];
          if (!isPaused) {
            sym.rot += sym.rotSpeed * speedMultiplier;
          }

          const depth = sym.depth;
          const floatY = Math.sin(globalTime * sym.floatSpeed + sym.floatPhase) * (14 * depth);
          const sx = sym.xRatio * width + cameraRef.current.x * depth * 0.5;
          const sy = sym.yRatio * height + floatY + cameraRef.current.y * depth * 0.5;

          const currentSize = sym.baseSize * (0.8 + depth * 0.35);
          const alpha = depth > 0.75 ? 0.72 : depth > 0.55 ? 0.48 : 0.28;
          const color = sym.color === 'cyan' ? `rgba(0, 242, 255, ${alpha})` : sym.color === 'purple' ? `rgba(192, 132, 252, ${alpha})` : `rgba(216, 180, 254, ${alpha})`;
          const glow = sym.color === 'cyan' ? '#00f2ff' : '#c084fc';

          ctx.save();
          ctx.translate(sx, sy);
          ctx.rotate(sym.rot);

          ctx.font = `bold ${Math.round(currentSize)}px "Cinzel", "Times New Roman", serif, sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillStyle = color;
          ctx.shadowColor = glow;
          ctx.shadowBlur = depth > 0.7 ? 16 : 8;
          ctx.fillText(sym.char, 0, 0);

          if (depth > 0.7) {
            ctx.strokeStyle = `rgba(255, 255, 255, ${alpha * 0.85})`;
            ctx.lineWidth = 0.85;
            ctx.strokeText(sym.char, 0, 0);
          }

          ctx.restore();
        }
        ctx.restore();
      }

      // --- LAYER 4: Floating Hexagonal Data Clusters ---
      if (enable3DObjects) {
        ctx.save();
        for (let hIdx = 0; hIdx < hexClusters.length; hIdx++) {
          const hex = hexClusters[hIdx];
          if (!isPaused) {
            hex.rot += hex.rotSpeed * speedMultiplier;
          }

          const depth = hex.depth;
          const floatY = Math.sin(globalTime * 0.7 + hex.floatPhase) * (12 * depth);
          const hx = hex.xRatio * width + cameraRef.current.x * depth * 0.4;
          const hy = hex.yRatio * height + floatY + cameraRef.current.y * depth * 0.4;

          const hAlpha = depth > 0.7 ? 0.55 : 0.35;
          const hColor = hex.color === 'cyan' ? `rgba(0, 242, 255, ${hAlpha})` : `rgba(192, 132, 252, ${hAlpha})`;

          ctx.save();
          ctx.translate(hx, hy);
          ctx.rotate(hex.rot);

          ctx.strokeStyle = hColor;
          ctx.lineWidth = 1.1;
          ctx.shadowColor = hex.color === 'cyan' ? '#00f2ff' : '#c084fc';
          ctx.shadowBlur = 10;

          // Draw hexagon
          ctx.beginPath();
          for (let s = 0; s < 6; s++) {
            const angle = (s / 6) * Math.PI * 2;
            const px = Math.cos(angle) * hex.radius;
            const py = Math.sin(angle) * hex.radius;
            if (s === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          }
          ctx.closePath();
          ctx.stroke();

          // Inner mini-hex & central node
          ctx.beginPath();
          for (let s = 0; s < 6; s++) {
            const angle = (s / 6) * Math.PI * 2;
            const px = Math.cos(angle) * (hex.radius * 0.45);
            const py = Math.sin(angle) * (hex.radius * 0.45);
            if (s === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          }
          ctx.closePath();
          ctx.stroke();

          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(0, 0, 1.8, 0, Math.PI * 2);
          ctx.fill();

          ctx.restore();
        }
        ctx.restore();
      }

      // --- LAYER 5: Floating 3D Crystalline Geometries ---
      if (enable3DObjects) {
        ctx.save();
        const fov = 340;

        for (let cIdx = 0; cIdx < crystals.length; cIdx++) {
          const crystal = crystals[cIdx];
          const geom = GEOM_DEFS[crystal.type];
          if (!geom) continue;

          if (!isPaused) {
            crystal.rotX += crystal.speedRotX * speedMultiplier;
            crystal.rotY += crystal.speedRotY * speedMultiplier;
            crystal.rotZ += crystal.speedRotZ * speedMultiplier;
          }

          const depth = crystal.depth;
          const floatOffset = Math.sin(globalTime * crystal.floatSpeed + crystal.floatPhase) * (14 * depth);
          const centerX = crystal.xRatio * width + cameraRef.current.x * depth * 0.55;
          const centerY = crystal.yRatio * height + floatOffset + cameraRef.current.y * depth * 0.55;

          const isCyan = crystal.color === 'cyan';
          const baseAlpha = depth > 0.7 ? 0.65 : 0.38;
          const strokeColor = isCyan ? `rgba(0, 242, 255, ${baseAlpha})` : `rgba(192, 132, 252, ${baseAlpha})`;
          const glowColor = isCyan ? '#00f2ff' : '#c084fc';

          const projVerts: { x: number; y: number; z: number }[] = [];
          for (let vIdx = 0; vIdx < geom.vertices.length; vIdx++) {
            const v = geom.vertices[vIdx];
            const rot = rotate3DPoint(v.x, v.y, v.z, crystal.rotX, crystal.rotY, crystal.rotZ);
            const scaleZ = fov / (fov + rot.z * crystal.scale + 120 * (1 - depth));
            const px = centerX + rot.x * crystal.scale * scaleZ;
            const py = centerY + rot.y * crystal.scale * scaleZ;
            projVerts.push({ x: px, y: py, z: rot.z });
          }

          ctx.strokeStyle = strokeColor;
          ctx.lineWidth = depth > 0.7 ? 1.25 : 0.95;
          ctx.shadowColor = glowColor;
          ctx.shadowBlur = depth > 0.7 ? 14 : 7;

          for (let eIdx = 0; eIdx < geom.edges.length; eIdx++) {
            const [i1, i2] = geom.edges[eIdx];
            const p1 = projVerts[i1];
            const p2 = projVerts[i2];
            if (!p1 || !p2) continue;

            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
          }

          if (depth > 0.7) {
            ctx.fillStyle = '#ffffff';
            for (let vIdx = 0; vIdx < projVerts.length; vIdx++) {
              const pv = projVerts[vIdx];
              if (pv.z > 0.2) {
                ctx.beginPath();
                ctx.arc(pv.x, pv.y, 1.3, 0, Math.PI * 2);
                ctx.fill();
              }
            }
          }
        }
        ctx.restore();
      }

      // --- LAYER 6: Faint Streams of Glowing Code & Equations ---
      if (enableCodeStreams) {
        ctx.save();
        ctx.font = '11px "JetBrains Mono", Menlo, Consolas, monospace';
        ctx.textAlign = 'left';

        for (let cIdx = 0; cIdx < codeFragments.length; cIdx++) {
          const frag = codeFragments[cIdx];
          if (!isPaused) {
            frag.yRatio -= frag.speedY * speedMultiplier * 60 * dt;
            if (frag.yRatio < -0.05) frag.yRatio = 1.05;
          }

          const fx = frag.xRatio * width + cameraRef.current.x * frag.depth * 0.3;
          const fy = frag.yRatio * height + cameraRef.current.y * frag.depth * 0.3;
          const pulse = 0.5 + 0.5 * Math.sin(globalTime * 1.5 + frag.pulsePhase);
          const fAlpha = frag.alpha * (0.6 + pulse * 0.4);

          ctx.fillStyle = `rgba(56, 189, 248, ${fAlpha})`;
          ctx.shadowColor = '#00f2ff';
          ctx.shadowBlur = 6;
          ctx.fillText(frag.text, fx, fy);
        }
        ctx.restore();
      }

      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [speedMultiplier, enable3DObjects, enableCodeStreams, isPaused]);

  return (
    <div
      ref={containerRef}
      aria-hidden="true"
      className="fixed inset-0 pointer-events-none z-0 overflow-hidden select-none"
    >
      {/* 1. Deep Space Atmospheric Dark Grey & Obsidian Base Void (#02040b) */}
      <div className="absolute inset-0 bg-[#02040b]" />

      {/* 2. Complex 8K Artificial Neural Network Core Image Layer (Slow Cinematic Zoom & Drift) */}
      <div className="absolute inset-0 overflow-hidden opacity-60 mix-blend-screen pointer-events-none">
        <img
          src={NEURAL_NETWORK_CORE_IMAGE}
          alt="Cinematic Artificial Neural Network Core 8K"
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover object-center scale-105 animate-[cosmicDrift_60s_ease-in-out_infinite_alternate]"
        />
      </div>

      {/* 3. Cinematic Vignette & Deep Lighting Bloom (Blue, Cyan, Purple Glow against Dark Grey Void) */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#02040b] via-[#030614]/50 to-[#02040b]/80 pointer-events-none mix-blend-multiply" />
      <div className="absolute inset-0 bg-radial from-transparent via-[#02040b]/40 to-[#02040b]/90 pointer-events-none" />

      {/* Radiant blue & purple ambient illumination */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_42%,rgba(6,182,212,0.16),transparent_65%)] pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_42%,rgba(168,85,247,0.12),transparent_75%)] pointer-events-none" />

      {/* 4. Live Interactive Canvas Simulation (Nucleus, Spherical Cage, 3D Symbols, Code, Pulses) */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full block pointer-events-none"
      />

      {/* 5. Scanline / Depth Filter */}
      <div className="absolute inset-0 bg-[linear-gradient(to_bottom,transparent_50%,rgba(0,0,0,0.18)_51%)] bg-[length:100%_4px] opacity-10 pointer-events-none" />

      {/* 6. Atmospheric UI Control Widget (Only when showAtmosphereButton is true and never on landing) */}
      {showAtmosphereButton && (
        <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-40 pointer-events-auto flex flex-col items-end gap-2 print:hidden">
          {controlsOpen ? (
            <div className="p-4 rounded-2xl bg-slate-900/95 backdrop-blur-2xl border border-cyan-500/35 shadow-2xl shadow-cyan-950/80 text-slate-200 text-xs w-76 space-y-3.5 animate-in fade-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <div className="flex items-center gap-2 font-semibold text-cyan-300">
                  <Sparkles className="w-4 h-4 text-cyan-400 animate-pulse" />
                  <span>Neural Core Atmosphere</span>
                </div>
                <button
                  onClick={() => setControlsOpen(false)}
                  className="text-slate-400 hover:text-slate-200 p-1 rounded-md hover:bg-slate-800 transition-colors cursor-pointer"
                  aria-label="Close atmosphere settings"
                >
                  ✕
                </button>
              </div>

              {/* Simulation Speed */}
              <div className="space-y-1">
                <div className="flex justify-between text-[11px]">
                  <span className="text-slate-400 font-mono">Neural Drift Speed</span>
                  <span className="text-cyan-400 font-mono">{speedMultiplier.toFixed(2)}x</span>
                </div>
                <input
                  type="range"
                  min="0.2"
                  max="1.5"
                  step="0.05"
                  value={speedMultiplier}
                  onChange={(e) => setSpeedMultiplier(parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                />
              </div>

              {/* 3D Holographic Objects & Code Toggles */}
              <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-800/80 text-[11px]">
                <button
                  onClick={() => setEnable3DObjects(!enable3DObjects)}
                  className={`px-2.5 py-1.5 rounded-lg border text-left transition-colors flex items-center gap-1.5 cursor-pointer ${
                    enable3DObjects
                      ? 'bg-cyan-950/40 text-cyan-300 border-cyan-800/70'
                      : 'bg-slate-950/50 text-slate-500 border-slate-800'
                  }`}
                >
                  <Layers className="w-3 h-3 text-cyan-400 shrink-0" />
                  <span className="truncate">3D Objects: {enable3DObjects ? 'ON' : 'OFF'}</span>
                </button>

                <button
                  onClick={() => setEnableCodeStreams(!enableCodeStreams)}
                  className={`px-2.5 py-1.5 rounded-lg border text-left transition-colors flex items-center gap-1.5 cursor-pointer ${
                    enableCodeStreams
                      ? 'bg-purple-950/40 text-purple-300 border-purple-800/70'
                      : 'bg-slate-950/50 text-slate-500 border-slate-800'
                  }`}
                >
                  <Cpu className="w-3 h-3 text-purple-400 shrink-0" />
                  <span className="truncate">Code: {enableCodeStreams ? 'ON' : 'OFF'}</span>
                </button>
              </div>

              {/* Pause / Resume */}
              <div className="pt-2 flex items-center justify-end border-t border-slate-800/80">
                <button
                  onClick={() => setIsPaused(!isPaused)}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-[11px] font-medium transition-colors cursor-pointer"
                >
                  {isPaused ? <Play className="w-3 h-3 text-emerald-400" /> : <Pause className="w-3 h-3 text-amber-400" />}
                  <span>{isPaused ? 'Resume' : 'Pause'}</span>
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setControlsOpen(true)}
              className="group flex items-center gap-2.5 px-3.5 py-2 rounded-full bg-slate-900/85 hover:bg-slate-850 backdrop-blur-xl border border-cyan-500/40 text-cyan-300 hover:text-cyan-200 text-xs font-mono shadow-xl shadow-cyan-950/60 transition-all hover:scale-105 active:scale-95 cursor-pointer"
              title="Open Neural Core Atmosphere Settings"
            >
              <Cpu className="w-3.5 h-3.5 text-cyan-400 group-hover:rotate-6 transition-transform" />
              <span className="hidden sm:inline">Neural Atmosphere</span>
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
            </button>
          )}
        </div>
      )}
    </div>
  );
};
