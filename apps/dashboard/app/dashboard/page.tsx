'use client';

import { motion } from 'motion/react';
import { Cpu, Layers, Rocket, AlertTriangle } from 'lucide-react';
import { StatCard, DeviceStatusChart, RecentDeployments } from '@/components/dashboard';
import { SplitText, AnimatedContent, RotatingText } from '@/components/reactbits';

// Mock data for demonstration
const mockStats = {
  totalDevices: 1247,
  totalFleets: 24,
  activeDeployments: 8,
  alerts: 3,
  deviceStatus: {
    online: 1089,
    offline: 112,
    maintenance: 46,
  },
};

const mockDeployments = [
  {
    id: '1',
    firmwareVersion: 'v2.4.1',
    fleetName: 'Production Fleet A',
    status: 'Running',
    progress: 67,
    createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
  },
  {
    id: '2',
    firmwareVersion: 'v2.4.0',
    fleetName: 'Staging Fleet',
    status: 'Completed',
    progress: 100,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
  },
  {
    id: '3',
    firmwareVersion: 'v2.3.9',
    fleetName: 'Development',
    status: 'Paused',
    progress: 45,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
  },
];

export default function DashboardPage() {
  const stats = mockStats;
  const deployments = mockDeployments;

  return (
    <div className="space-y-6">
      {/* Header with animated text */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          <SplitText text="Dashboard" delay={0} duration={0.4} splitBy="characters" />
        </h1>
        <p className="text-gray-500 flex items-center gap-1 mt-1">
          <span>Welcome back! Currently</span>
          <RotatingText
            texts={[
              'monitoring devices',
              'tracking deployments',
              'analyzing metrics',
              'optimizing fleet',
            ]}
            rotationInterval={3000}
            className="text-primary-600 font-medium"
          />
        </p>
      </div>

      {/* Stats Grid with staggered animations */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Devices"
          value={stats.totalDevices}
          change={12}
          icon={Cpu}
          iconColor="bg-primary-100 text-primary-600"
          index={0}
        />
        <StatCard
          title="Active Fleets"
          value={stats.totalFleets}
          change={4}
          icon={Layers}
          iconColor="bg-success-50 text-success-600"
          index={1}
        />
        <StatCard
          title="Active Deployments"
          value={stats.activeDeployments}
          icon={Rocket}
          iconColor="bg-warning-50 text-warning-600"
          index={2}
        />
        <StatCard
          title="Alerts"
          value={stats.alerts}
          icon={AlertTriangle}
          iconColor="bg-danger-50 text-danger-600"
          index={3}
        />
      </div>

      {/* Charts Row with animated entry */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <AnimatedContent distance={40} delay={0.4} className="h-full">
          <DeviceStatusChart data={stats.deviceStatus} />
        </AnimatedContent>
        <AnimatedContent distance={40} delay={0.5} className="h-full">
          <RecentDeployments deployments={deployments} />
        </AnimatedContent>
      </div>
    </div>
  );
}
