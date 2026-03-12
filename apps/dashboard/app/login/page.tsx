'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'motion/react';
import {
  Button,
  Input,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui';
import { SplitText, RotatingText, ElectricBorder, AnimatedContent } from '@/components/reactbits';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/store';

export default function LoginPage() {
  const router = useRouter();
  const { setAuth } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const data = await api.login(email, password);
      setAuth(data.user, data.accessToken);
      router.push('/dashboard');
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      setError(error.response?.data?.message || 'Invalid credentials');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 px-4 overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <motion.div
          className="absolute -top-40 -right-40 w-80 h-80 bg-primary-500/20 rounded-full blur-3xl"
          animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-500/20 rounded-full blur-3xl"
          animate={{ scale: [1.2, 1, 1.2], opacity: [0.5, 0.3, 0.5] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>

      <AnimatedContent distance={60} duration={0.8} className="relative z-10 w-full max-w-md">
        <ElectricBorder
          color="#6366f1"
          speed={0.8}
          chaos={0.08}
          borderRadius={20}
          className="p-[1px]"
        >
          <Card className="w-full bg-gray-900/80 backdrop-blur-xl border-0">
            <CardHeader className="text-center pb-2">
              <motion.div
                className="mx-auto mb-6 h-16 w-16 rounded-2xl bg-gradient-to-br from-primary-500 to-purple-600 flex items-center justify-center shadow-lg shadow-primary-500/25"
                whileHover={{ scale: 1.05, rotate: 5 }}
                transition={{ type: 'spring', stiffness: 300 }}
              >
                <span className="text-3xl font-bold text-white">F</span>
              </motion.div>
              <CardTitle className="text-3xl text-white">
                <SplitText text="Welcome back" delay={0.2} duration={0.4} />
              </CardTitle>
              <CardDescription className="text-gray-400 mt-2 flex items-center justify-center gap-1">
                <span>Sign in to</span>
                <RotatingText
                  texts={['manage fleets', 'deploy firmware', 'monitor devices', 'view analytics']}
                  rotationInterval={2500}
                  className="text-primary-400 font-medium"
                />
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              <form onSubmit={handleSubmit} className="space-y-5">
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-lg bg-danger-500/10 border border-danger-500/20 p-3 text-sm text-danger-400"
                  >
                    {error}
                  </motion.div>
                )}
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  <Input
                    id="email"
                    type="email"
                    label="Email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="bg-gray-800/50 border-gray-700 text-white placeholder:text-gray-500 focus:border-primary-500"
                  />
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 }}
                >
                  <Input
                    id="password"
                    type="password"
                    label="Password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="bg-gray-800/50 border-gray-700 text-white placeholder:text-gray-500 focus:border-primary-500"
                  />
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                >
                  <Button
                    type="submit"
                    className="w-full bg-gradient-to-r from-primary-500 to-purple-600 hover:from-primary-600 hover:to-purple-700 text-white shadow-lg shadow-primary-500/25 transition-all duration-300"
                    isLoading={isLoading}
                  >
                    Sign in
                  </Button>
                </motion.div>
              </form>
              <motion.p
                className="mt-6 text-center text-sm text-gray-500"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
              >
                Don&apos;t have an account?{' '}
                <Link
                  href="/register"
                  className="text-primary-400 hover:text-primary-300 transition-colors"
                >
                  Sign up
                </Link>
              </motion.p>
            </CardContent>
          </Card>
        </ElectricBorder>
      </AnimatedContent>
    </div>
  );
}
