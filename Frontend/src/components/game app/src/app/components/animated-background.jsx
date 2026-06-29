import { useEffect, useRef } from "react";

const PARTICLE_COLORS = ["#FFDF63", "#CF7D3B", "#AE0021", "#6A1646", "#E8B15D"];
const MAX_PIXEL_RATIO = 1.5;
const CONNECTION_DISTANCE = 100;
const CONNECTION_DISTANCE_SQUARED = CONNECTION_DISTANCE * CONNECTION_DISTANCE;
const CELL_SIZE = CONNECTION_DISTANCE;

export function AnimatedBackground() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    let cssWidth = 0;
    let cssHeight = 0;
    let particles = [];
    let animationId = 0;
    let resizeFrame = 0;

    function getParticleCount() {
      if (mediaQuery.matches) {
        return 28;
      }

      const area = window.innerWidth * window.innerHeight;
      const densityCount = Math.round(area / 22000);
      return Math.max(40, Math.min(90, densityCount));
    }

    function createParticle() {
      return {
        x: Math.random() * cssWidth,
        y: Math.random() * cssHeight,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        size: Math.random() * 2 + 1,
        color: PARTICLE_COLORS[Math.floor(Math.random() * PARTICLE_COLORS.length)],
      };
    }

    function syncCanvasSize() {
      cssWidth = window.innerWidth;
      cssHeight = window.innerHeight;

      const pixelRatio = Math.min(window.devicePixelRatio || 1, MAX_PIXEL_RATIO);
      canvas.width = Math.max(1, Math.floor(cssWidth * pixelRatio));
      canvas.height = Math.max(1, Math.floor(cssHeight * pixelRatio));
      canvas.style.width = `${cssWidth}px`;
      canvas.style.height = `${cssHeight}px`;
      ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

      particles = Array.from({ length: getParticleCount() }, createParticle);
    }

    function drawConnections() {
      const grid = new Map();

      particles.forEach((particle, index) => {
        const cellX = Math.floor(particle.x / CELL_SIZE);
        const cellY = Math.floor(particle.y / CELL_SIZE);
        const key = `${cellX},${cellY}`;
        const cellParticles = grid.get(key);

        if (cellParticles) {
          cellParticles.push(index);
        } else {
          grid.set(key, [index]);
        }
      });

      for (let index = 0; index < particles.length; index += 1) {
        const particle = particles[index];
        const cellX = Math.floor(particle.x / CELL_SIZE);
        const cellY = Math.floor(particle.y / CELL_SIZE);

        for (let offsetX = -1; offsetX <= 1; offsetX += 1) {
          for (let offsetY = -1; offsetY <= 1; offsetY += 1) {
            const neighborIndexes = grid.get(`${cellX + offsetX},${cellY + offsetY}`);

            if (!neighborIndexes) {
              continue;
            }

            neighborIndexes.forEach((neighborIndex) => {
              if (neighborIndex <= index) {
                return;
              }

              const otherParticle = particles[neighborIndex];
              const dx = particle.x - otherParticle.x;
              const dy = particle.y - otherParticle.y;
              const distanceSquared = dx * dx + dy * dy;

              if (distanceSquared >= CONNECTION_DISTANCE_SQUARED) {
                return;
              }

              const opacity =
                0.2 * (1 - Math.sqrt(distanceSquared) / CONNECTION_DISTANCE);

              ctx.strokeStyle = `rgba(255, 223, 99, ${opacity})`;
              ctx.lineWidth = 0.5;
              ctx.beginPath();
              ctx.moveTo(particle.x, particle.y);
              ctx.lineTo(otherParticle.x, otherParticle.y);
              ctx.stroke();
            });
          }
        }
      }
    }

    function animate() {
      ctx.clearRect(0, 0, cssWidth, cssHeight);
      ctx.fillStyle = "rgba(61, 20, 38, 0.12)";
      ctx.fillRect(0, 0, cssWidth, cssHeight);

      particles.forEach((particle) => {
        particle.x += particle.vx;
        particle.y += particle.vy;

        if (particle.x < 0) particle.x = cssWidth;
        if (particle.x > cssWidth) particle.x = 0;
        if (particle.y < 0) particle.y = cssHeight;
        if (particle.y > cssHeight) particle.y = 0;

        ctx.shadowBlur = 20;
        ctx.shadowColor = particle.color;
        ctx.fillStyle = particle.color;
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx.fill();
      });

      ctx.shadowBlur = 0;
      drawConnections();
      animationId = requestAnimationFrame(animate);
    }

    function handleResize() {
      cancelAnimationFrame(resizeFrame);
      resizeFrame = requestAnimationFrame(syncCanvasSize);
    }

    syncCanvasSize();
    animate();
    window.addEventListener("resize", handleResize);

    return () => {
      cancelAnimationFrame(animationId);
      cancelAnimationFrame(resizeFrame);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex: 0 }}
    />
  );
}
