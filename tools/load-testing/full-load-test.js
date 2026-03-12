/**
 * FleetForge Full Load Test
 *
 * Comprehensive load test simulating real-world usage patterns.
 *
 * Usage:
 *   k6 run tools/load-testing/full-load-test.js --env BASE_URL=http://localhost:3000
 *
 * Options:
 *   --env AUTH_TOKEN=<jwt_token>
 *   --env STAGE=smoke|load|stress|soak
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Counter, Trend } from 'k6/metrics';
import { randomIntBetween, randomItem } from 'https://jslib.k6.io/k6-utils/1.2.0/index.js';

// Custom metrics
const successRate = new Rate('success_rate');
const apiCalls = new Counter('api_calls');
const responseTimes = new Trend('response_times', true);

// Configuration
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const AUTH_TOKEN = __ENV.AUTH_TOKEN || '';
const STAGE = __ENV.STAGE || 'load';

// Test scenarios
const stages = {
  smoke: [{ duration: '1m', target: 10 }],
  load: [
    { duration: '5m', target: 50 },
    { duration: '10m', target: 50 },
    { duration: '5m', target: 0 },
  ],
  stress: [
    { duration: '5m', target: 100 },
    { duration: '10m', target: 100 },
    { duration: '5m', target: 200 },
    { duration: '10m', target: 200 },
    { duration: '5m', target: 300 },
    { duration: '10m', target: 300 },
    { duration: '5m', target: 0 },
  ],
  soak: [
    { duration: '5m', target: 100 },
    { duration: '4h', target: 100 },
    { duration: '5m', target: 0 },
  ],
};

export const options = {
  stages: stages[STAGE],
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1000'],
    http_req_failed: ['rate<0.01'],
    success_rate: ['rate>0.95'],
  },
  noConnectionReuse: false,
  userAgent: 'FleetForge-LoadTest/1.0',
};

const headers = {
  'Content-Type': 'application/json',
  Authorization: AUTH_TOKEN ? `Bearer ${AUTH_TOKEN}` : '',
};

// Scenarios with weights (simulate real traffic distribution)
const scenarios = [
  { name: 'list_devices', weight: 30 },
  { name: 'get_device', weight: 25 },
  { name: 'send_telemetry', weight: 20 },
  { name: 'list_deployments', weight: 10 },
  { name: 'health_check', weight: 10 },
  { name: 'get_firmware', weight: 5 },
];

function weightedRandom() {
  const totalWeight = scenarios.reduce((sum, s) => sum + s.weight, 0);
  let random = Math.random() * totalWeight;
  for (const scenario of scenarios) {
    random -= scenario.weight;
    if (random <= 0) return scenario.name;
  }
  return scenarios[0].name;
}

export function setup() {
  // Warmup request
  http.get(`${BASE_URL}/health`);
  console.log(`Starting ${STAGE} full load test against ${BASE_URL}`);
  return { startTime: new Date().toISOString() };
}

export default function () {
  const scenario = weightedRandom();
  const deviceId = `device-${randomIntBetween(1, 1000)}`;

  const start = new Date();
  let res;

  switch (scenario) {
    case 'list_devices':
      res = http.get(`${BASE_URL}/api/devices?page=1&limit=20`, { headers });
      break;
    case 'get_device':
      res = http.get(`${BASE_URL}/api/devices/${deviceId}`, { headers });
      break;
    case 'send_telemetry':
      res = http.post(
        `${BASE_URL}/api/devices/${deviceId}/telemetry`,
        JSON.stringify({
          timestamp: new Date().toISOString(),
          metrics: { cpuUsage: Math.random() * 100 },
        }),
        { headers }
      );
      break;
    case 'list_deployments':
      res = http.get(`${BASE_URL}/api/deployments?page=1&limit=10`, { headers });
      break;
    case 'health_check':
      res = http.get(`${BASE_URL}/health`);
      break;
    case 'get_firmware':
      res = http.get(`${BASE_URL}/api/firmware?page=1&limit=5`, { headers });
      break;
  }

  apiCalls.add(1);
  responseTimes.add(new Date() - start);

  const success = check(res, {
    'status is valid': (r) => r && [200, 201, 404].includes(r.status),
    'response time OK': (r) => r && r.timings.duration < 1000,
  });
  successRate.add(success);

  sleep(randomIntBetween(1, 3) / 10);
}

export function teardown(data) {
  console.log(`Full load test completed. Started at: ${data.startTime}`);
}

