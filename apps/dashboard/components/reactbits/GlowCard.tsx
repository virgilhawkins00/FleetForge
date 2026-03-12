'use client';

import { useRef, useState, useCallback } from 'react';
import { motion } from 'motion/react';

interface GlowCardProps {
  children: React.ReactNode;
  className?: string;
  glowColor?: string;
  glowSize?: number;
  borderRadius?: number;
}

export function GlowCard({
  children,
  className = '',
  glowColor = 'rgba(82, 39, 255, 0.4)',
  glowSize = 200,
  borderRadius = 16,
}: GlowCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    setMousePosition({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  }, []);

  return (
    <motion.div
      ref={cardRef}
      className={`relative overflow-hidden ${className}`}
      style={{ borderRadius }}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      whileHover={{ scale: 1.02 }}
      transition={{ duration: 0.2 }}
    >
      {/* Glow effect */}
      <motion.div
        className="absolute pointer-events-none"
        style={{
          width: glowSize,
          height: glowSize,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${glowColor} 0%, transparent 70%)`,
          left: mousePosition.x - glowSize / 2,
          top: mousePosition.y - glowSize / 2,
        }}
        animate={{
          opacity: isHovered ? 1 : 0,
        }}
        transition={{ duration: 0.3 }}
      />
      
      {/* Content */}
      <div className="relative z-10">{children}</div>
    </motion.div>
  );
}

