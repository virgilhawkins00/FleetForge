#!/usr/bin/env node

/**
 * FleetForge Endpoint Latency Benchmark
 * 
 * Measures response times for all API endpoints
 * 
 * Usage: node endpoint-benchmark.js [--base-url http://localhost:3100]
 */

const http = require('http');
const https = require('https');

const BASE_URL = process.env.BASE_URL || 'http://localhost:3100';
const ITERATIONS = parseInt(process.env.ITERATIONS) || 100;

const endpoints = [
  { method: 'GET', path: '/health', name: 'Health Check' },
  { method: 'GET', path: '/health/ready', name: 'Ready Check' },
  { method: 'GET', path: '/metrics', name: 'Prometheus Metrics' },
  { method: 'GET', path: '/api/devices', name: 'List Devices', auth: true },
  { method: 'GET', path: '/api/fleets', name: 'List Fleets', auth: true },
  { method: 'GET', path: '/api/firmware', name: 'List Firmware', auth: true },
];

let authToken = null;

async function login() {
  return new Promise((resolve, reject) => {
    const url = new URL('/api/auth/login', BASE_URL);
    const data = JSON.stringify({ email: 'test@fleetforge.io', password: 'Test123!' });
    
    const options = {
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: url.pathname,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) }
    };

    const client = url.protocol === 'https:' ? https : http;
    const req = client.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(body);
          authToken = json.accessToken;
          resolve(authToken);
        } catch (e) {
          resolve(null);
        }
      });
    });
    req.on('error', () => resolve(null));
    req.write(data);
    req.end();
  });
}

async function benchmark(endpoint) {
  const times = [];
  const errors = [];

  for (let i = 0; i < ITERATIONS; i++) {
    const start = process.hrtime.bigint();
    try {
      await makeRequest(endpoint);
      const end = process.hrtime.bigint();
      times.push(Number(end - start) / 1e6); // Convert to ms
    } catch (err) {
      errors.push(err.message);
    }
  }

  return calculateStats(times, errors);
}

async function makeRequest(endpoint) {
  return new Promise((resolve, reject) => {
    const url = new URL(endpoint.path, BASE_URL);
    const options = {
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: url.pathname,
      method: endpoint.method,
      headers: {}
    };

    if (endpoint.auth && authToken) {
      options.headers['Authorization'] = `Bearer ${authToken}`;
    }

    const client = url.protocol === 'https:' ? https : http;
    const req = client.request(options, (res) => {
      res.on('data', () => {});
      res.on('end', () => {
        if (res.statusCode >= 400) {
          reject(new Error(`HTTP ${res.statusCode}`));
        } else {
          resolve();
        }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

function calculateStats(times, errors) {
  if (times.length === 0) return { error: 'No successful requests' };
  
  times.sort((a, b) => a - b);
  const sum = times.reduce((a, b) => a + b, 0);
  
  return {
    count: times.length,
    errors: errors.length,
    min: times[0].toFixed(2),
    max: times[times.length - 1].toFixed(2),
    avg: (sum / times.length).toFixed(2),
    p50: times[Math.floor(times.length * 0.5)].toFixed(2),
    p95: times[Math.floor(times.length * 0.95)].toFixed(2),
    p99: times[Math.floor(times.length * 0.99)].toFixed(2),
  };
}

async function main() {
  console.log('🚀 FleetForge Endpoint Benchmark');
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`Iterations: ${ITERATIONS}\n`);

  // Try to login for authenticated endpoints
  await login();
  if (authToken) console.log('✓ Authenticated\n');

  console.log('| Endpoint | Min | Avg | P50 | P95 | P99 | Max | Errors |');
  console.log('|----------|-----|-----|-----|-----|-----|-----|--------|');

  for (const endpoint of endpoints) {
    const stats = await benchmark(endpoint);
    if (stats.error) {
      console.log(`| ${endpoint.name} | ERROR: ${stats.error} |`);
    } else {
      console.log(`| ${endpoint.name} | ${stats.min}ms | ${stats.avg}ms | ${stats.p50}ms | ${stats.p95}ms | ${stats.p99}ms | ${stats.max}ms | ${stats.errors} |`);
    }
  }

  console.log('\n✓ Benchmark complete');
}

main().catch(console.error);

