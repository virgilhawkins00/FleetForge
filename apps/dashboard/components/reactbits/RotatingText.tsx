'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface RotatingTextProps {
  texts: string[];
  rotationInterval?: number;
  className?: string;
  splitBy?: 'characters' | 'words';
  staggerDuration?: number;
}

export function RotatingText({
  texts,
  rotationInterval = 3000,
  className = '',
  splitBy = 'characters',
  staggerDuration = 0.025,
}: RotatingTextProps) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % texts.length);
    }, rotationInterval);
    return () => clearInterval(interval);
  }, [texts.length, rotationInterval]);

  const currentText = texts[index];
  const elements = splitBy === 'words' 
    ? currentText.split(' ') 
    : currentText.split('');

  return (
    <span className={`inline-flex overflow-hidden ${className}`}>
      <AnimatePresence mode="wait">
        <motion.span
          key={index}
          className="inline-flex"
          initial="hidden"
          animate="visible"
          exit="exit"
          variants={{
            hidden: {},
            visible: {
              transition: { staggerChildren: staggerDuration },
            },
            exit: {
              transition: { staggerChildren: staggerDuration / 2, staggerDirection: -1 },
            },
          }}
        >
          {elements.map((char, i) => (
            <motion.span
              key={`${index}-${i}`}
              className="inline-block"
              variants={{
                hidden: { y: '100%', opacity: 0 },
                visible: { y: 0, opacity: 1 },
                exit: { y: '-100%', opacity: 0 },
              }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
            >
              {char === ' ' ? '\u00A0' : char}
            </motion.span>
          ))}
          {splitBy === 'words' && '\u00A0'}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

