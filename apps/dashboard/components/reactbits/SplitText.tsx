'use client';

import { useMemo } from 'react';
import { motion, Variants, TargetAndTransition } from 'motion/react';

interface SplitTextProps {
  text: string;
  className?: string;
  delay?: number;
  duration?: number;
  ease?: string;
  splitBy?: 'characters' | 'words' | 'lines';
  staggerChildren?: number;
  animateOnView?: boolean;
  once?: boolean;
}

export function SplitText({
  text,
  className = '',
  delay = 0,
  duration = 0.5,
  ease = 'easeOut',
  splitBy = 'characters',
  staggerChildren = 0.03,
  animateOnView = true,
  once = true,
}: SplitTextProps) {
  const elements = useMemo(() => {
    switch (splitBy) {
      case 'words':
        return text.split(' ').map((word, i) => ({ text: word, key: i }));
      case 'lines':
        return text.split('\n').map((line, i) => ({ text: line, key: i }));
      default:
        return text.split('').map((char, i) => ({ text: char === ' ' ? '\u00A0' : char, key: i }));
    }
  }, [text, splitBy]);

  const containerVariants: Variants = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren,
        delayChildren: delay,
      },
    },
  };

  const childVariants: Variants = {
    hidden: { opacity: 0, y: 20, filter: 'blur(4px)' },
    visible: {
      opacity: 1,
      y: 0,
      filter: 'blur(0px)',
      transition: { duration, ease },
    },
  };

  return (
    <motion.span
      className={`inline-flex flex-wrap ${className}`}
      variants={containerVariants}
      initial="hidden"
      {...(animateOnView ? { whileInView: 'visible', viewport: { once } } : { animate: 'visible' })}
    >
      {elements.map(({ text: el, key }) => (
        <motion.span key={key} variants={childVariants} className="inline-block">
          {el}
          {splitBy === 'words' && key < elements.length - 1 && '\u00A0'}
        </motion.span>
      ))}
    </motion.span>
  );
}

