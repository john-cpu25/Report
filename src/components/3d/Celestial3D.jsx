import React, { useRef, useMemo, useCallback, useEffect } from 'react';
import * as THREE from 'three';
import useThreeCanvas from './useThreeCanvas';

const ZODIAC_CONSTELLATIONS = [
  { name: 'Capricorn', month: 0, stars: [[0, 2], [2, 1], [3, -1], [1, -3], [-1, -2], [-2, 0]] },
  { name: 'Aquarius', month: 1, stars: [[-2, 1], [-1, 3], [0, 2], [1, 4], [2, 3], [3, 5]] },
  { name: 'Pisces', month: 2, stars: [[-3, -2], [-2, 0], [0, 0], [2, 1], [3, -1], [4, 1]] },
  { name: 'Aries', month: 3, stars: [[-2, 1], [0, 0], [2, 0.5], [3, 2]] },
  { name: 'Taurus', month: 4, stars: [[-3, -2], [-1, 0], [0, 1], [1, 0], [3, -2], [2, 2]] },
  { name: 'Gemini', month: 5, stars: [[-2, 3], [-2, -2], [0, 3], [0, -2], [2, 3], [2, -2]] },
  { name: 'Cancer', month: 6, stars: [[0, 3], [0, 0], [-1, -2], [1, -2]] },
  { name: 'Leo', month: 7, stars: [[3, 2], [2, 0], [1, -1], [0, -1], [-1, 0], [-2, 2], [0, 2]] },
  { name: 'Virgo', month: 8, stars: [[-3, 0], [-1, -1], [0, 1], [1, -1], [3, 0], [2, 2], [-2, 2]] },
  { name: 'Libra', month: 9, stars: [[0, 3], [-1, 0], [1, 0], [0, -3]] },
  { name: 'Scorpio', month: 10, stars: [[3, 3], [2, 2], [1, 0], [0, -2], [-1, -3], [-2, -2.5], [-2.5, -1.5]] },
  { name: 'Sagittarius', month: 11, stars: [[-2, -2], [-1, 0], [0, 2], [1, 0], [2, -2], [0, -1], [0, -3]] }
];

/**
 * Celestial3D Component
 * 3D Starfield & Constellation Engine with smooth mouse parallax
 * Replaces 100+ DOM div elements and SVG in CelestialBackground.
 */
const Celestial3D = () => {
  const canvasRef = useRef(null);
  const mouseRef = useRef({ x: 0, y: 0, targetX: 0, targetY: 0 });

  const currentMonth = useMemo(() => new Date().getMonth(), []);
  const activeConstellation = useMemo(
    () => ZODIAC_CONSTELLATIONS[currentMonth] || ZODIAC_CONSTELLATIONS[0],
    [currentMonth]
  );

  // Mouse move listener for smooth 3D parallax
  useEffect(() => {
    const handleMouseMove = (e) => {
      const x = (e.clientX / window.innerWidth) * 2 - 1;
      const y = -(e.clientY / window.innerHeight) * 2 + 1;
      mouseRef.current.targetX = x * 1.5;
      mouseRef.current.targetY = y * 1.2;
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const initScene = useCallback(({ scene, camera }) => {
    camera.position.set(0, 0, 18);

    // 1. DENSE 3D STARFIELD (2,500 Stars)
    const starCount = 2500;
    const starGeo = new THREE.BufferGeometry();
    const starPositions = new Float32Array(starCount * 3);
    const starColors = new Float32Array(starCount * 3);
    const starSizes = new Float32Array(starCount);

    const colorWhite = new THREE.Color('#FFFFFF');
    const colorCyan = new THREE.Color('#818CF8');
    const colorGold = new THREE.Color('#FDE047');
    const colorRose = new THREE.Color('#F472B6');

    for (let i = 0; i < starCount; i++) {
      const i3 = i * 3;
      // Spherical distribution with depth
      const r = Math.random() * 50 + 10;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);

      starPositions[i3] = r * Math.sin(phi) * Math.cos(theta);
      starPositions[i3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      starPositions[i3 + 2] = r * Math.cos(phi);

      // Star color variation
      const randColor = Math.random();
      const chosenColor = randColor > 0.8
        ? colorCyan
        : randColor > 0.65
        ? colorGold
        : randColor > 0.55
        ? colorRose
        : colorWhite;

      starColors[i3] = chosenColor.r;
      starColors[i3 + 1] = chosenColor.g;
      starColors[i3 + 2] = chosenColor.b;

      starSizes[i] = Math.random() * 2.0 + 0.8;
    }

    starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    starGeo.setAttribute('color', new THREE.BufferAttribute(starColors, 3));
    starGeo.setAttribute('size', new THREE.BufferAttribute(starSizes, 1));

    const starMat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexColors: true,
      uniforms: {
        uTime: { value: 0 },
        uPixelRatio: { value: Math.min(window.devicePixelRatio || 1, 2) }
      },
      vertexShader: `
        attribute float size;
        varying vec3 vColor;
        varying float vDepth;
        uniform float uPixelRatio;

        void main() {
          vColor = color;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          vDepth = -mvPosition.z;
          if (-mvPosition.z <= 0.5) {
            gl_PointSize = 0.0;
          } else {
            gl_PointSize = clamp(size * uPixelRatio * (80.0 / -mvPosition.z), 0.0, 32.0);
          }
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        uniform float uTime;

        void main() {
          vec2 uv = gl_PointCoord - vec2(0.5);
          float dist = length(uv);
          if (dist > 0.5) discard;

          float glow = smoothstep(0.48, 0.0, dist);
          gl_FragColor = vec4(vColor, glow);
        }
      `
    });

    const starPoints = new THREE.Points(starGeo, starMat);
    scene.add(starPoints);

    // 2. CONSTELLATION 3D LINES & GLOWING NODES
    const constelGroup = new THREE.Group();
    const cStars = activeConstellation.stars;

    // Constellation lines
    const linePoints = [];
    for (let i = 0; i < cStars.length - 1; i++) {
      const curr = cStars[i];
      const next = cStars[i + 1];
      linePoints.push(new THREE.Vector3(curr[0] * 1.5, curr[1] * 1.5, 2));
      linePoints.push(new THREE.Vector3(next[0] * 1.5, next[1] * 1.5, 2));
    }

    const lineGeo = new THREE.BufferGeometry().setFromPoints(linePoints);
    const lineMat = new THREE.LineBasicMaterial({
      color: 0x818cf8,
      transparent: true,
      opacity: 0.45,
      blending: THREE.AdditiveBlending,
      linewidth: 1.5
    });
    const constellationLines = new THREE.LineSegments(lineGeo, lineMat);
    constelGroup.add(constellationLines);

    // Constellation main star nodes
    const nodeGeo = new THREE.BufferGeometry();
    const nodePositions = new Float32Array(cStars.length * 3);
    for (let i = 0; i < cStars.length; i++) {
      nodePositions[i * 3] = cStars[i][0] * 1.5;
      nodePositions[i * 3 + 1] = cStars[i][1] * 1.5;
      nodePositions[i * 3 + 2] = 2;
    }
    nodeGeo.setAttribute('position', new THREE.BufferAttribute(nodePositions, 3));

    const nodeMat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: { uTime: { value: 0 } },
      vertexShader: `
        uniform float uTime;
        void main() {
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          if (-mvPosition.z <= 0.5) {
            gl_PointSize = 0.0;
          } else {
            gl_PointSize = clamp((12.0 + sin(uTime * 3.0 + position.x) * 3.0) * (50.0 / -mvPosition.z), 0.0, 32.0);
          }
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        void main() {
          vec2 uv = gl_PointCoord - vec2(0.5);
          float dist = length(uv);
          if (dist > 0.5) discard;
          float core = smoothstep(0.48, 0.0, dist);
          gl_FragColor = vec4(0.8, 0.85, 1.0, core);
        }
      `
    });

    const constellationNodes = new THREE.Points(nodeGeo, nodeMat);
    constelGroup.add(constellationNodes);

    constelGroup.position.set(0, 0, 0);
    scene.add(constelGroup);

    return {
      onFrame: ({ delta, elapsed }) => {
        // Slow celestial rotation
        starPoints.rotation.y = elapsed * 0.015;
        starPoints.rotation.x = elapsed * 0.008;

        constelGroup.rotation.y = Math.sin(elapsed * 0.2) * 0.05;
        constelGroup.rotation.x = Math.cos(elapsed * 0.2) * 0.05;

        // Smooth Parallax Lerp
        const mouse = mouseRef.current;
        mouse.x += (mouse.targetX - mouse.x) * 0.05;
        mouse.y += (mouse.targetY - mouse.y) * 0.05;

        camera.position.x = mouse.x * 2.0;
        camera.position.y = mouse.y * 1.5;
        camera.lookAt(0, 0, 0);

        starMat.uniforms.uTime.value = elapsed;
        nodeMat.uniforms.uTime.value = elapsed;
      },
      cleanup: () => {
        starGeo.dispose();
        starMat.dispose();
        lineGeo.dispose();
        lineMat.dispose();
        nodeGeo.dispose();
        nodeMat.dispose();
        scene.remove(starPoints, constelGroup);
      }
    };
  }, [activeConstellation]);

  const { isSupported } = useThreeCanvas(canvasRef, initScene, {
    alpha: true,
    antialias: false,
    powerPreference: 'high-performance'
  });

  if (!isSupported) return null;

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-[-1] w-full h-full"
      style={{ display: 'block', backgroundColor: 'transparent' }}
    />
  );
};

export default React.memo(Celestial3D);
