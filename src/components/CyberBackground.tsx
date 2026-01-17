import React, { useEffect, useRef } from 'react';

export const CyberBackground: React.FC = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let animationFrameId: number;
        let bubbles: Bubble[] = [];

        // Exactly match the cluster density in the provided image
        const bubbleCount = 28;
        const clusterTarget = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
        const clusterCurrent = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
        const inertia = 0.06; // Smooth, liquid trailing

        class Bubble {
            offsetX: number;
            offsetY: number;
            radiusX: number;
            radiusY: number;
            rotation: number;
            opacity: number;
            pulseAngle: number;
            pulseSpeed: number;
            driftAngle: number;
            driftSpeed: number;
            driftRadius: number;

            constructor() {
                // Distribute bubbles in a loose, rectangular cluster like the image
                this.offsetX = (Math.random() - 0.5) * 400;
                this.offsetY = (Math.random() - 0.5) * 200;

                // Randomize between circles and flattened ellipses as seen in image
                const baseSize = 10 + Math.random() * 30;
                const aspect = 0.4 + Math.random() * 1.2;
                this.radiusX = baseSize * aspect;
                this.radiusY = baseSize / (aspect * 0.8);

                this.rotation = Math.random() * Math.PI;
                this.opacity = 0.2 + Math.random() * 0.4; // Clearly visible outlines

                this.pulseAngle = Math.random() * Math.PI * 2;
                this.pulseSpeed = 0.01 + Math.random() * 0.015;

                this.driftAngle = Math.random() * Math.PI * 2;
                this.driftSpeed = 0.003 + Math.random() * 0.008;
                this.driftRadius = 15 + Math.random() * 25;
            }

            update() {
                // Maintain cluster cohesion with subtle individual movement
                this.driftAngle += this.driftSpeed;
                const currentDriftX = Math.cos(this.driftAngle) * this.driftRadius;
                const currentDriftY = Math.sin(this.driftAngle) * this.driftRadius;

                this.pulseAngle += this.pulseSpeed;
                const pulseScale = 1 + Math.sin(this.pulseAngle) * 0.05;

                const x = clusterCurrent.x + this.offsetX + currentDriftX;
                const y = clusterCurrent.y + this.offsetY + currentDriftY;

                this.draw(x, y, pulseScale);
            }

            draw(x: number, y: number, scale: number) {
                if (!ctx) return;

                ctx.beginPath();
                // Use ellipse for the organic look in the image
                ctx.ellipse(
                    x,
                    y,
                    this.radiusX * scale,
                    this.radiusY * scale,
                    this.rotation,
                    0,
                    Math.PI * 2
                );

                // Stroke only - as shown in the requested image
                ctx.strokeStyle = `rgba(0, 242, 190, ${this.opacity})`; // Teal/Green tint
                ctx.lineWidth = 1.5;
                ctx.stroke();

                // Add subtle neon glow
                ctx.shadowBlur = 4;
                ctx.shadowColor = `rgba(0, 242, 190, ${this.opacity * 0.5})`;
            }
        }

        const init = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            bubbles = [];
            for (let i = 0; i < bubbleCount; i++) {
                bubbles.push(new Bubble());
            }
        };

        const animate = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

            if (!prefersReducedMotion) {
                // Lagging inertia center
                clusterCurrent.x += (clusterTarget.x - clusterCurrent.x) * inertia;
                clusterCurrent.y += (clusterTarget.y - clusterCurrent.y) * inertia;
            } else {
                clusterCurrent.x = clusterTarget.x;
                clusterCurrent.y = clusterTarget.y;
            }

            bubbles.forEach(bubble => bubble.update());

            animationFrameId = requestAnimationFrame(animate);
        };

        const handleMouseMove = (e: MouseEvent) => {
            clusterTarget.x = e.clientX;
            clusterTarget.y = e.clientY;
        };

        const handleResize = () => {
            init();
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('resize', handleResize);

        init();
        animate();

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('resize', handleResize);
            cancelAnimationFrame(animationFrameId);
        };
    }, []);

    return (
        <canvas
            ref={canvasRef}
            className="fixed inset-0 pointer-events-none z-[-1]"
        />
    );
};
