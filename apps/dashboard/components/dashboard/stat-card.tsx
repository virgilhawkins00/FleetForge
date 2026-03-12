'use client';

import { motion } from 'motion/react';
import { Card, CardContent } from '@/components/ui';
import { GlowCard, Counter } from '@/components/reactbits';
import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  change?: number;
  icon: LucideIcon;
  iconColor?: string;
  index?: number;
}

export function StatCard({
  title,
  value,
  change,
  icon: Icon,
  iconColor = 'bg-primary-100 text-primary-600',
  index = 0,
}: StatCardProps) {
  const numericValue = typeof value === 'string' ? parseFloat(value.replace(/,/g, '')) : value;
  const isNumeric = !isNaN(numericValue);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
    >
      <GlowCard glowColor="rgba(99, 102, 241, 0.15)" glowSize={180} className="h-full">
        <Card className="h-full border-gray-200/50 hover:border-primary-200 transition-colors duration-300">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">{title}</p>
                <div className="mt-2">
                  {isNumeric ? (
                    <Counter
                      value={numericValue}
                      fontSize={30}
                      duration={2}
                      className="text-gray-900 font-bold"
                    />
                  ) : (
                    <p className="text-3xl font-bold text-gray-900">{value}</p>
                  )}
                </div>
                {change !== undefined && (
                  <motion.p
                    className={cn(
                      'mt-1 text-sm flex items-center gap-1',
                      change >= 0 ? 'text-success-600' : 'text-danger-600',
                    )}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 + index * 0.1 }}
                  >
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', stiffness: 500, delay: 0.6 + index * 0.1 }}
                    >
                      {change >= 0 ? '↑' : '↓'}
                    </motion.span>
                    {Math.abs(change)}% from last month
                  </motion.p>
                )}
              </div>
              <motion.div
                className={cn('rounded-xl p-3', iconColor)}
                whileHover={{ scale: 1.1, rotate: 5 }}
                transition={{ type: 'spring', stiffness: 400 }}
              >
                <Icon className="h-6 w-6" />
              </motion.div>
            </div>
          </CardContent>
        </Card>
      </GlowCard>
    </motion.div>
  );
}
