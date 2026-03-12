'use client';

import { useRef, useEffect, useMemo } from 'react';

interface ElectricBorderProps {
  color?: string;
  speed?: number;
  chaos?: number;
  borderRadius?: number;
  className?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
}

export function ElectricBorder({
  color = '#5227FF',
  speed = 1,
  chaos = 0.12,
  borderRadius = 24,
  className = '',
  style,
  children,
}: ElectricBorderProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const pathRef = useRef<SVGPathElement>(null);
  const animationRef = useRef<number>();

  const gradientId = useMemo(() => `electric-gradient-${Math.random().toString(36).slice(2)}`, []);

  useEffect(() => {
    let time = 0;
    const animate = () => {
      time += 0.016 * speed;
      if (pathRef.current && svgRef.current) {
        const rect = svgRef.current.getBoundingClientRect();
        const w = rect.width;
        const h = rect.height;
        const r = Math.min(borderRadius, w / 2, h / 2);
        
        let d = `M ${r} 0 `;
        const segments = 60;
        const perimeter = 2 * (w + h - 4 * r) + 2 * Math.PI * r;
        
        for (let i = 0; i <= segments; i++) {
          const t = i / segments;
          const pos = t * perimeter;
          let x = 0, y = 0;
          
          const topStraight = w - 2 * r;
          const rightStraight = h - 2 * r;
          const bottomStraight = w - 2 * r;
          const leftStraight = h - 2 * r;
          const cornerArc = Math.PI * r / 2;
          
          if (pos < topStraight) {
            x = r + pos;
            y = 0;
          } else if (pos < topStraight + cornerArc) {
            const angle = (pos - topStraight) / r;
            x = w - r + Math.sin(angle) * r;
            y = r - Math.cos(angle) * r;
          } else if (pos < topStraight + cornerArc + rightStraight) {
            x = w;
            y = r + (pos - topStraight - cornerArc);
          } else {
            x = w - (pos - topStraight - cornerArc - rightStraight) * (w / (perimeter - topStraight - cornerArc - rightStraight));
            y = h;
          }
          
          const offset = Math.sin(time * 3 + t * 20) * chaos * 8;
          x += offset * (Math.random() - 0.5);
          y += offset * (Math.random() - 0.5);
          
          d += `${i === 0 ? 'M' : 'L'} ${x} ${y} `;
        }
        
        pathRef.current.setAttribute('d', d);
      }
      animationRef.current = requestAnimationFrame(animate);
    };
    
    animate();
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [speed, chaos, borderRadius]);

  return (
    <div className={`relative ${className}`} style={style}>
      <svg
        ref={svgRef}
        className="absolute inset-0 w-full h-full pointer-events-none"
        style={{ overflow: 'visible' }}
      >
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={color} stopOpacity="1" />
            <stop offset="50%" stopColor={color} stopOpacity="0.5" />
            <stop offset="100%" stopColor={color} stopOpacity="1" />
          </linearGradient>
          <filter id={`${gradientId}-glow`}>
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <path
          ref={pathRef}
          fill="none"
          stroke={`url(#${gradientId})`}
          strokeWidth="2"
          filter={`url(#${gradientId}-glow)`}
        />
      </svg>
      {children}
    </div>
  );
}

