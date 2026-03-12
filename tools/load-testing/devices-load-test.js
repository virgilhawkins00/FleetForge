/**
 * FleetForge Load Test - Device Management
 *
 * Tests device CRUD operations and telemetry endpoints under load.
 *
 * Usage:
 *   k6 run tools/load-testing/devices-load-test.js --env BASE_URL=http://localhost:3000
 *
 * Options:
 *   --env AUTH_TOKEN=<jwt_token>
 *   --env STAGE=smoke|load|stress|spike
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Counter, Trend } from 'k6/metrics';

// Custom metrics
const deviceOpsSuccess = new Rate('device_ops_success');
const listDevicesCounter = new Counter('list_devices_requests');
const getDeviceCounter = new Counter('get_device_requests');
const telemetryCounter = new Counter('telemetry_requests');
const deviceOpsDuration = new Trend('device_ops_duration', true);

// Configuration
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const AUTH_TOKEN = __ENV.AUTH_TOKEN || '';
const STAGE = __ENV.STAGE || 'load';

// Test scenarios
const stages = {
  smoke: [{ duration: '30s', target: 10 }],
  load: [
    { duration: '2m', target: 50 },
    { duration: '5m', target: 50 },
    { duration: '2m', target: 0 },
  ],
  stress: [
    { duration: '2m', target: 100 },
    { duration: '5m', target: 100 },
    { duration: '2m', target: 200 },
    { duration: '5m', target: 200 },
    { duration: '2m', target: 0 },
  ],
  spike: [
    { duration: '10s', target: 50 },
    { duration: '1m', target: 50 },
    { duration: '10s', target: 300 },
    { duration: '3m', target: 300 },
    { duration: '10s', target: 50 },
    { duration: '1m', target: 0 },
  ],
};

export const options = {
  stages: stages[STAGE],
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1000'],
    http_req_failed: ['rate<0.02'],
    device_ops_success: ['rate>0.95'],
  },
};

const headers = {
  'Content-Type': 'application/json',
  Authorization: AUTH_TOKEN ? `Bearer ${AUTH_TOKEN}` : '',
};

export function setup() {
  console.log(`Starting ${STAGE} device test against ${BASE_URL}`);
  return { startTime: new Date().toISOString() };
}

export default function () {
  const deviceId = `device-${Math.floor(Math.random() * 1000)}`;

  group('Device Operations', function () {
    // List devices
    const listStart = new Date();
    const listRes = http.get(`${BASE_URL}/api/devices?page=1&limit=20`, {
      headers,
      tags: { name: 'list_devices' },
    });
    listDevicesCounter.add(1);
    deviceOpsDuration.add(new Date() - listStart);

    const listSuccess = check(listRes, {
      'list devices returns 200': (r) => r.status === 200,
      'list devices response time < 300ms': (r) => r.timings.duration < 300,
      'list devices returns array': (r) => {
        try {
          const body = r.json();
          return Array.isArray(body.items || body.data || body);
        } catch {
          return false;
        }
      },
    });
    deviceOpsSuccess.add(listSuccess);
    sleep(0.5);

    // Get single device
    const getStart = new Date();
    const getRes = http.get(`${BASE_URL}/api/devices/${deviceId}`, {
      headers,
      tags: { name: 'get_device' },
    });
    getDeviceCounter.add(1);
    deviceOpsDuration.add(new Date() - getStart);

    check(getRes, {
      'get device returns valid status': (r) => [200, 404].includes(r.status),
      'get device response time < 200ms': (r) => r.timings.duration < 200,
    });
    sleep(0.5);

    // Send telemetry
    const telemetryStart = new Date();
    const telemetryRes = http.post(
      `${BASE_URL}/api/devices/${deviceId}/telemetry`,
      JSON.stringify({
        timestamp: new Date().toISOString(),
        metrics: {
          cpuUsage: Math.random() * 100,
          memoryUsage: Math.random() * 100,
          temperature: 20 + Math.random() * 40,
          batteryLevel: Math.random() * 100,
        },
        location: {
          latitude: -23.5505 + (Math.random() - 0.5) * 0.1,
          longitude: -46.6333 + (Math.random() - 0.5) * 0.1,
        },
      }),
      { headers, tags: { name: 'telemetry' } }
    );
    telemetryCounter.add(1);
    deviceOpsDuration.add(new Date() - telemetryStart);

    check(telemetryRes, {
      'telemetry returns valid status': (r) => [200, 201, 404].includes(r.status),
      'telemetry response time < 100ms': (r) => r.timings.duration < 100,
    });
  });

  sleep(Math.random() * 2 + 0.5);
}

export function teardown(data) {
  console.log(`Device test completed. Started at: ${data.startTime}`);
}

