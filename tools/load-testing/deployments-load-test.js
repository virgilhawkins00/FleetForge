/**
 * FleetForge Load Test - Deployment Operations
 *
 * Tests firmware deployment workflow under load.
 *
 * Usage:
 *   k6 run tools/load-testing/deployments-load-test.js --env BASE_URL=http://localhost:3000
 *
 * Options:
 *   --env AUTH_TOKEN=<jwt_token>
 *   --env STAGE=smoke|load|stress
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Counter, Trend } from 'k6/metrics';

// Custom metrics
const deploymentOpsSuccess = new Rate('deployment_ops_success');
const createDeploymentCounter = new Counter('create_deployment_requests');
const listDeploymentCounter = new Counter('list_deployment_requests');
const deploymentDuration = new Trend('deployment_ops_duration', true);

// Configuration
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const AUTH_TOKEN = __ENV.AUTH_TOKEN || '';
const STAGE = __ENV.STAGE || 'load';

// Test scenarios (more conservative for deployments)
const stages = {
  smoke: [{ duration: '30s', target: 5 }],
  load: [
    { duration: '2m', target: 20 },
    { duration: '5m', target: 20 },
    { duration: '2m', target: 0 },
  ],
  stress: [
    { duration: '2m', target: 50 },
    { duration: '5m', target: 50 },
    { duration: '2m', target: 100 },
    { duration: '5m', target: 100 },
    { duration: '2m', target: 0 },
  ],
};

export const options = {
  stages: stages[STAGE],
  thresholds: {
    http_req_duration: ['p(95)<1000', 'p(99)<2000'],
    http_req_failed: ['rate<0.05'],
    deployment_ops_success: ['rate>0.90'],
  },
};

const headers = {
  'Content-Type': 'application/json',
  Authorization: AUTH_TOKEN ? `Bearer ${AUTH_TOKEN}` : '',
};

// Sample firmware versions
const firmwareVersions = [
  'v1.0.0',
  'v1.0.1',
  'v1.1.0',
  'v1.2.0',
  'v2.0.0',
  'v2.0.1',
];

export function setup() {
  console.log(`Starting ${STAGE} deployment test against ${BASE_URL}`);
  return { startTime: new Date().toISOString() };
}

export default function () {
  const fleetId = `fleet-${Math.floor(Math.random() * 10)}`;
  const firmwareVersion =
    firmwareVersions[Math.floor(Math.random() * firmwareVersions.length)];

  group('Deployment Operations', function () {
    // List deployments
    const listStart = new Date();
    const listRes = http.get(`${BASE_URL}/api/deployments?page=1&limit=10`, {
      headers,
      tags: { name: 'list_deployments' },
    });
    listDeploymentCounter.add(1);
    deploymentDuration.add(new Date() - listStart);

    const listSuccess = check(listRes, {
      'list deployments returns 200': (r) => r.status === 200,
      'list deployments response time < 500ms': (r) => r.timings.duration < 500,
    });
    deploymentOpsSuccess.add(listSuccess);
    sleep(1);

    // Create deployment (only 10% of iterations to avoid overwhelming)
    if (Math.random() < 0.1) {
      const createStart = new Date();
      const createRes = http.post(
        `${BASE_URL}/api/deployments`,
        JSON.stringify({
          name: `load-test-deployment-${Date.now()}`,
          fleetId: fleetId,
          firmwareVersion: firmwareVersion,
          strategy: 'rolling',
          config: {
            batchSize: 10,
            batchDelayMs: 5000,
            maxFailurePercentage: 10,
          },
        }),
        { headers, tags: { name: 'create_deployment' } }
      );
      createDeploymentCounter.add(1);
      deploymentDuration.add(new Date() - createStart);

      const createSuccess = check(createRes, {
        'create deployment returns valid status': (r) =>
          [200, 201, 400, 404].includes(r.status),
        'create deployment response time < 1000ms': (r) =>
          r.timings.duration < 1000,
      });
      deploymentOpsSuccess.add(createSuccess);

      // If created, get status
      if (createRes.status === 201 || createRes.status === 200) {
        try {
          const deployment = createRes.json();
          if (deployment.id) {
            sleep(0.5);
            const statusRes = http.get(
              `${BASE_URL}/api/deployments/${deployment.id}/status`,
              { headers, tags: { name: 'deployment_status' } }
            );
            check(statusRes, {
              'status returns valid response': (r) =>
                [200, 404].includes(r.status),
            });
          }
        } catch {
          // Ignore JSON parse errors
        }
      }
    }
  });

  sleep(Math.random() * 3 + 1);
}

export function teardown(data) {
  console.log(`Deployment test completed. Started at: ${data.startTime}`);
}

