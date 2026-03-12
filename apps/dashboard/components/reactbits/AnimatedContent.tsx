'use client';

import { useRef, useEffect } from 'react';
import { motion, useInView, useAnimation } from 'motion/react';

interface AnimatedContentProps {
  children: React.ReactNode;
  distance?: number;
  direction?: 'vertical' | 'horizontal';
  reverse?: boolean;
  duration?: number;
  ease?: string;
  initialOpacity?: number;
  animateOpacity?: boolean;
  scale?: number;
  threshold?: number;
  delay?: number;
  onComplete?: () => void;
  className?: string;
}

export function AnimatedContent({
  children,
  distance = 50,
  direction = 'vertical',
  reverse = false,
  duration = 0.6,
  ease = 'easeOut',
  initialOpacity = 0,
  animateOpacity = true,
  scale = 1,
  threshold = 0.1,
  delay = 0,
  onComplete,
  className = '',
}: AnimatedContentProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, amount: threshold });
  const controls = useAnimation();

  const getInitialPosition = () => {
    const d = reverse ? -distance : distance;
    return direction === 'vertical' ? { y: d, x: 0 } : { x: d, y: 0 };
  };

  useEffect(() => {
    if (isInView) {
      controls.start({
        x: 0,
        y: 0,
        opacity: 1,
        scale: 1,
        transition: { duration, ease, delay },
      }).then(() => {
        onComplete?.();
      });
    }
  }, [isInView, controls, duration, ease, delay, onComplete]);

  const initial = {
    ...getInitialPosition(),
    opacity: animateOpacity ? initialOpacity : 1,
    scale,
  };

  return (
    <motion.div
      ref={ref}
      initial={initial}
      animate={controls}
      className={className}
    >
      {children}
    </motion.div>
  );
}

