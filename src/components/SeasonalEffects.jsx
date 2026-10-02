import React, { useEffect, useRef } from 'react';

/**
 * SeasonalEffects
 * Canvas-based ultra-smooth festive particle engine:
 * - NOEL: Falling crystalline snowflakes with gentle horizontal breeze
 * - TET: Falling pink peach blossoms (hoa đào) & golden apricot blossoms (hoa mai) with 3D rotation
 * - VALENTINE: Floating glowing hearts drifting upwards with soft pulse
 * - FIREWORKS: Celebration fireworks bursting in vibrant colors
 * - AUTO: Automatically detects current calendar month/date
 */

const getAutoSeason = () => {
  const now = new Date();
  const month = now.getMonth() + 1; // 1 - 12
  const day = now.getDate();

  if (month === 12) return 'NOEL';
  if (month === 2 && day >= 8 && day <= 18) return 'VALENTINE';
  if (month === 1 || month === 2) return 'TET';
  return 'NOEL'; // Default fallback
};

const SeasonalEffects = ({ effect = 'AUTO', intensity = 'MEDIUM' }) => {
  const canvasRef = useRef(null);

  const activeEffect = effect === 'AUTO' ? getAutoSeason() : effect;

  useEffect(() => {
    if (activeEffect === 'NONE' || !activeEffect) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationFrameId;

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    // Particle count multiplier based on intensity
    const countMultiplier = intensity === 'LOW' ? 0.5 : intensity === 'HIGH' ? 1.6 : 1.0;

    // ─────────────────────────────────────────────────────────────
    // 1. NOEL PARTICLES (SNOWFLAKES)
    // ─────────────────────────────────────────────────────────────
    const initSnow = () => {
      const count = Math.floor(60 * countMultiplier);
      const particles = [];
      for (let i = 0; i < count; i++) {
        particles.push({
          x: Math.random() * width,
          y: Math.random() * height,
          radius: Math.random() * 3 + 1,
          speedY: Math.random() * 1.2 + 0.6,
          speedX: Math.random() * 0.8 - 0.4,
          opacity: Math.random() * 0.7 + 0.3,
          isStar: Math.random() > 0.8,
          wobble: Math.random() * Math.PI * 2,
          wobbleSpeed: Math.random() * 0.03 + 0.01
        });
      }

      return () => {
        ctx.clearRect(0, 0, width, height);
        particles.forEach(p => {
          p.y += p.speedY;
          p.wobble += p.wobbleSpeed;
          p.x += Math.sin(p.wobble) * 0.8 + p.speedX;

          if (p.y > height + 10) {
            p.y = -10;
            p.x = Math.random() * width;
          }
          if (p.x > width + 10) p.x = -10;
          if (p.x < -10) p.x = width + 10;

          ctx.save();
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255, 255, 255, ${p.opacity})`;
          ctx.shadowBlur = p.isStar ? 8 : 4;
          ctx.shadowColor = 'rgba(255, 255, 255, 0.8)';
          ctx.fill();

          // Render subtle 6-point crystal cross for some flakes
          if (p.isStar && p.radius > 2) {
            ctx.strokeStyle = `rgba(224, 242, 254, ${p.opacity * 0.8})`;
            ctx.lineWidth = 0.8;
            ctx.beginPath();
            ctx.moveTo(p.x - p.radius * 1.8, p.y);
            ctx.lineTo(p.x + p.radius * 1.8, p.y);
            ctx.moveTo(p.x, p.y - p.radius * 1.8);
            ctx.lineTo(p.x, p.y + p.radius * 1.8);
            ctx.stroke();
          }
          ctx.restore();
        });
      };
    };

    // ─────────────────────────────────────────────────────────────
    // 2. TET PARTICLES (PEACH & APRICOT BLOSSOMS / HOA ĐÀO & MAI)
    // ─────────────────────────────────────────────────────────────
    const initTet = () => {
      const count = Math.floor(45 * countMultiplier);
      const particles = [];
      const colors = [
        '#fda4af', // light pink (hoa đào)
        '#f43f5e', // deep pink (hoa đào rực rỡ)
        '#fb7185', // rose pink
        '#fde047', // apricot yellow (hoa mai)
        '#fef08a'  // soft yellow (hoa mai vàng)
      ];

      for (let i = 0; i < count; i++) {
        particles.push({
          x: Math.random() * width,
          y: Math.random() * height,
          size: Math.random() * 8 + 8,
          speedY: Math.random() * 1.2 + 0.8,
          speedX: Math.random() * 1.2 - 0.3,
          rotation: Math.random() * 360,
          rotationSpeed: (Math.random() - 0.5) * 2,
          flip: Math.random() * 360,
          flipSpeed: Math.random() * 2 + 1,
          color: colors[Math.floor(Math.random() * colors.length)],
          opacity: Math.random() * 0.4 + 0.55
        });
      }

      return () => {
        ctx.clearRect(0, 0, width, height);
        particles.forEach(p => {
          p.y += p.speedY;
          p.x += Math.sin(p.flip * (Math.PI / 180)) * 1.2 + p.speedX;
          p.rotation += p.rotationSpeed;
          p.flip += p.flipSpeed;

          if (p.y > height + 20) {
            p.y = -20;
            p.x = Math.random() * width;
          }
          if (p.x > width + 20) p.x = -20;
          if (p.x < -20) p.x = width + 20;

          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate((p.rotation * Math.PI) / 180);
          ctx.scale(1, Math.cos((p.flip * Math.PI) / 180));

          // Draw a soft blossom petal
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.bezierCurveTo(-p.size / 2, -p.size / 2, -p.size, p.size / 3, 0, p.size);
          ctx.bezierCurveTo(p.size, p.size / 3, p.size / 2, -p.size / 2, 0, 0);
          ctx.fillStyle = p.color;
          ctx.globalAlpha = p.opacity;
          ctx.shadowBlur = 6;
          ctx.shadowColor = p.color;
          ctx.fill();

          ctx.restore();
        });
      };
    };

    // ─────────────────────────────────────────────────────────────
    // 3. VALENTINE PARTICLES (FLOATING HEARTS)
    // ─────────────────────────────────────────────────────────────
    const initValentine = () => {
      const count = Math.floor(35 * countMultiplier);
      const particles = [];
      const colors = ['#f43f5e', '#ec4899', '#fb7185', '#fda4af', '#e11d48'];

      for (let i = 0; i < count; i++) {
        particles.push({
          x: Math.random() * width,
          y: Math.random() * height,
          size: Math.random() * 8 + 8,
          speedY: -(Math.random() * 0.9 + 0.5), // Drifts gently upwards
          sway: Math.random() * Math.PI * 2,
          swaySpeed: Math.random() * 0.02 + 0.01,
          swayRadius: Math.random() * 1.2 + 0.5,
          color: colors[Math.floor(Math.random() * colors.length)],
          opacity: Math.random() * 0.35 + 0.45,
          scale: 1,
          pulse: Math.random() * Math.PI * 2,
          pulseSpeed: Math.random() * 0.04 + 0.02
        });
      }

      const drawHeart = (c, x, y, size) => {
        c.beginPath();
        const topCurveHeight = size * 0.3;
        c.moveTo(x, y + topCurveHeight);
        // top left curve
        c.bezierCurveTo(x, y, x - size / 2, y, x - size / 2, y + topCurveHeight);
        // bottom left curve
        c.bezierCurveTo(x - size / 2, y + (size + topCurveHeight) / 2, x, y + (size + topCurveHeight) / 1.4, x, y + size);
        // bottom right curve
        c.bezierCurveTo(x, y + (size + topCurveHeight) / 1.4, x + size / 2, y + (size + topCurveHeight) / 2, x + size / 2, y + topCurveHeight);
        // top right curve
        c.bezierCurveTo(x + size / 2, y, x, y, x, y + topCurveHeight);
        c.closePath();
        c.fill();
      };

      return () => {
        ctx.clearRect(0, 0, width, height);
        particles.forEach(p => {
          p.y += p.speedY;
          p.sway += p.swaySpeed;
          p.x += Math.sin(p.sway) * p.swayRadius;
          p.pulse += p.pulseSpeed;
          const currentSize = p.size * (1 + Math.sin(p.pulse) * 0.12);

          if (p.y < -30) {
            p.y = height + 20;
            p.x = Math.random() * width;
          }
          if (p.x > width + 20) p.x = -20;
          if (p.x < -20) p.x = width + 20;

          ctx.save();
          ctx.fillStyle = p.color;
          ctx.globalAlpha = p.opacity;
          ctx.shadowBlur = 8;
          ctx.shadowColor = p.color;
          drawHeart(ctx, p.x, p.y, currentSize);
          ctx.restore();
        });
      };
    };

    // ─────────────────────────────────────────────────────────────
    // 4. FIREWORKS PARTICLES (CELEBRATION)
    // ─────────────────────────────────────────────────────────────
    const initFireworks = () => {
      let sparks = [];
      const colors = ['#f43f5e', '#38bdf8', '#4ade80', '#fbbf24', '#c084fc', '#f472b6'];

      const createBurst = (bx, by) => {
        const count = Math.floor(35 * countMultiplier);
        const burstColor = colors[Math.floor(Math.random() * colors.length)];
        for (let i = 0; i < count; i++) {
          const angle = Math.random() * Math.PI * 2;
          const speed = Math.random() * 4 + 1.5;
          sparks.push({
            x: bx,
            y: by,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            alpha: 1,
            decay: Math.random() * 0.02 + 0.015,
            color: burstColor,
            size: Math.random() * 2 + 1.2
          });
        }
      };

      let timer = 0;

      return () => {
        // Soft trail fade
        ctx.fillStyle = 'rgba(0, 0, 0, 0.12)';
        ctx.fillRect(0, 0, width, height);

        timer++;
        if (timer % 50 === 0) {
          createBurst(Math.random() * (width * 0.8) + width * 0.1, Math.random() * (height * 0.5) + height * 0.1);
        }

        sparks = sparks.filter(s => s.alpha > 0.02);
        sparks.forEach(s => {
          s.x += s.vx;
          s.y += s.vy;
          s.vy += 0.04; // gravity
          s.alpha -= s.decay;

          ctx.save();
          ctx.beginPath();
          ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
          ctx.fillStyle = s.color;
          ctx.globalAlpha = Math.max(0, s.alpha);
          ctx.shadowBlur = 6;
          ctx.shadowColor = s.color;
          ctx.fill();
          ctx.restore();
        });
      };
    };

    let stepFn = null;
    if (activeEffect === 'NOEL') stepFn = initSnow();
    else if (activeEffect === 'TET') stepFn = initTet();
    else if (activeEffect === 'VALENTINE') stepFn = initValentine();
    else if (activeEffect === 'FIREWORKS') stepFn = initFireworks();

    if (!stepFn) return;

    const render = () => {
      stepFn();
      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, [activeEffect, intensity]);

  if (activeEffect === 'NONE') return null;

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-[1]"
      style={{ width: '100%', height: '100%' }}
    />
  );
};

export default SeasonalEffects;
