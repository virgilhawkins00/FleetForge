/**
 * FleetForge Load Test - Authentication Flow
 *
 * This k6 script tests the authentication endpoints under load.
 *
 * Usage:
 *   k6 run tools/load-testing/auth-load-test.js --env BASE_URL=http://localhost:3000
 *
 * Options:
 *   --vus 100 --duration 60s    # 100 virtual users for 60 seconds
 *   --env STAGE=smoke|load|stress|spike
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Counter, Trend } from 'k6/metrics';

// Custom metrics
const authSuccessRate = new Rate('auth_success_rate');
const loginCounter = new Counter('login_requests');
const loginDuration = new Trend('login_duration', true);

// Configuration
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const STAGE = __ENV.STAGE || 'load';

// Test scenarios
const stages = {
  smoke: [{ duration: '30s', target: 5 }],
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
    { duration: '10s', target: 100 },
    { duration: '1m', target: 100 },
    { duration: '10s', target: 500 },
    { duration: '3m', target: 500 },
    { duration: '10s', target: 100 },
    { duration: '1m', target: 0 },
  ],
};

export const options = {
  stages: stages[STAGE],
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1000'],
    http_req_failed: ['rate<0.01'],
    auth_success_rate: ['rate>0.95'],
  },
};

// Test data
const testUsers = [];
for (let i = 0; i < 100; i++) {
  testUsers.push({
    email: `loadtest-user-${i}@fleetforge.test`,
    password: `LoadTest123!${i}`,
  });
}

export function setup() {
  console.log(`Starting ${STAGE} test against ${BASE_URL}`);
  return { startTime: new Date().toISOString() };
}

export default function () {
  const user = testUsers[Math.floor(Math.random() * testUsers.length)];

  group('Authentication Flow', function () {
    // Login attempt
    const loginStart = new Date();
    const loginRes = http.post(
      `${BASE_URL}/api/auth/login`,
      JSON.stringify({
        email: user.email,
        password: user.password,
      }),
      {
        headers: { 'Content-Type': 'application/json' },
        tags: { name: 'login' },
      }
    );

    loginCounter.add(1);
    loginDuration.add(new Date() - loginStart);

    const loginSuccess =
      loginRes.status === 200 || loginRes.status === 201 || loginRes.status === 401;

    authSuccessRate.add(loginSuccess);

    check(loginRes, {
      'login status is valid': (r) => [200, 201, 401].includes(r.status),
      'login response time < 500ms': (r) => r.timings.duration < 500,
    });

    // If login successful, test protected endpoint
    if (loginRes.status === 200 || loginRes.status === 201) {
      const token = loginRes.json('access_token');

      if (token) {
        // Test authenticated request
        const meRes = http.get(`${BASE_URL}/api/auth/me`, {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          tags: { name: 'me' },
        });

        check(meRes, {
          'me endpoint returns 200': (r) => r.status === 200,
          'me response time < 200ms': (r) => r.timings.duration < 200,
        });
      }
    }
  });

  sleep(Math.random() * 2 + 1); // Random sleep between 1-3 seconds
}

export function teardown(data) {
  console.log(`Test completed. Started at: ${data.startTime}`);
}

