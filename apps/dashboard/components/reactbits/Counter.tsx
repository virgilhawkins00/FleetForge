'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, useSpring, useTransform, useInView } from 'motion/react';

interface CounterProps {
  value: number;
  fontSize?: number;
  duration?: number;
  className?: string;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  animateOnView?: boolean;
}

export function Counter({
  value,
  fontSize = 48,
  duration = 2,
  className = '',
  prefix = '',
  suffix = '',
  decimals = 0,
  animateOnView = true,
}: CounterProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true });
  const [hasAnimated, setHasAnimated] = useState(false);

  const spring = useSpring(0, {
    stiffness: 100,
    damping: 30,
    duration: duration * 1000,
  });

  const display = useTransform(spring, (current) =>
    decimals > 0 ? current.toFixed(decimals) : Math.round(current).toLocaleString()
  );

  useEffect(() => {
    if (animateOnView) {
      if (isInView && !hasAnimated) {
        spring.set(value);
        setHasAnimated(true);
      }
    } else {
      spring.set(value);
    }
  }, [spring, value, isInView, animateOnView, hasAnimated]);

  return (
    <span ref={ref} className={`inline-flex items-baseline ${className}`} style={{ fontSize }}>
      {prefix && <span className="mr-1">{prefix}</span>}
      <motion.span className="tabular-nums font-bold">{display}</motion.span>
      {suffix && <span className="ml-1">{suffix}</span>}
    </span>
  );
}

