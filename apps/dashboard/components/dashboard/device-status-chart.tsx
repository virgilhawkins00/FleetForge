'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

interface DeviceStatusChartProps {
  data: {
    online: number;
    offline: number;
    maintenance: number;
  };
}

const COLORS = ['#22c55e', '#9ca3af', '#f59e0b'];

export function DeviceStatusChart({ data }: DeviceStatusChartProps) {
  const chartData = [
    { name: 'Online', value: data.online },
    { name: 'Offline', value: data.offline },
    { name: 'Maintenance', value: data.maintenance },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Device Status</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={5}
                dataKey="value"
              >
                {chartData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

