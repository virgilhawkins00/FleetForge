#!/usr/bin/env node

/**
 * FleetForge Throughput Benchmark
 * 
 * Measures maximum requests per second for critical endpoints
 * 
 * Usage: node throughput-benchmark.js [--duration 30] [--connections 50]
 */

const http = require('http');
const https = require('https');

const BASE_URL = process.env.BASE_URL || 'http://localhost:3100';
const DURATION = parseInt(process.env.DURATION) || 30; // seconds
const CONNECTIONS = parseInt(process.env.CONNECTIONS) || 50;

const scenarios = [
  { name: 'Health Check', method: 'GET', path: '/health', targetRps: 5000 },
  { name: 'Metrics', method: 'GET', path: '/metrics', targetRps: 1000 },
];

class ThroughputTest {
  constructor(scenario) {
    this.scenario = scenario;
    this.requests = 0;
    this.errors = 0;
    this.latencies = [];
    this.running = false;
  }

  async run(duration, connections) {
    this.running = true;
    const startTime = Date.now();
    const endTime = startTime + (duration * 1000);
    
    const workers = [];
    for (let i = 0; i < connections; i++) {
      workers.push(this.worker(endTime));
    }

    await Promise.all(workers);
    this.running = false;

    const elapsed = (Date.now() - startTime) / 1000;
    return this.calculateResults(elapsed);
  }

  async worker(endTime) {
    while (Date.now() < endTime && this.running) {
      const start = process.hrtime.bigint();
      try {
        await this.makeRequest();
        const end = process.hrtime.bigint();
        this.latencies.push(Number(end - start) / 1e6);
        this.requests++;
      } catch (err) {
        this.errors++;
      }
    }
  }

  makeRequest() {
    return new Promise((resolve, reject) => {
      const url = new URL(this.scenario.path, BASE_URL);
      const options = {
        hostname: url.hostname,
        port: url.port || (url.protocol === 'https:' ? 443 : 80),
        path: url.pathname,
        method: this.scenario.method,
        timeout: 5000,
      };

      const client = url.protocol === 'https:' ? https : http;
      const req = client.request(options, (res) => {
        res.on('data', () => {});
        res.on('end', () => {
          if (res.statusCode >= 400) reject(new Error(`HTTP ${res.statusCode}`));
          else resolve();
        });
      });
      
      req.on('error', reject);
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Timeout'));
      });
      req.end();
    });
  }

  calculateResults(elapsed) {
    const rps = this.requests / elapsed;
    this.latencies.sort((a, b) => a - b);
    
    const p50 = this.latencies[Math.floor(this.latencies.length * 0.5)] || 0;
    const p95 = this.latencies[Math.floor(this.latencies.length * 0.95)] || 0;
    const p99 = this.latencies[Math.floor(this.latencies.length * 0.99)] || 0;
    
    return {
      scenario: this.scenario.name,
      requests: this.requests,
      errors: this.errors,
      duration: elapsed.toFixed(2),
      rps: rps.toFixed(0),
      targetRps: this.scenario.targetRps,
      passed: rps >= this.scenario.targetRps * 0.8, // 80% of target is passing
      p50: p50.toFixed(2),
      p95: p95.toFixed(2),
      p99: p99.toFixed(2),
    };
  }
}

async function main() {
  console.log('🚀 FleetForge Throughput Benchmark');
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`Duration: ${DURATION}s`);
  console.log(`Connections: ${CONNECTIONS}\n`);

  const results = [];

  for (const scenario of scenarios) {
    console.log(`Testing: ${scenario.name}...`);
    const test = new ThroughputTest(scenario);
    const result = await test.run(DURATION, CONNECTIONS);
    results.push(result);
    console.log(`  ✓ ${result.rps} req/s (target: ${result.targetRps})\n`);
  }

  console.log('\n📊 Results Summary\n');
  console.log('| Scenario | RPS | Target | P50 | P95 | P99 | Errors | Status |');
  console.log('|----------|-----|--------|-----|-----|-----|--------|--------|');

  for (const r of results) {
    const status = r.passed ? '✅ PASS' : '❌ FAIL';
    console.log(`| ${r.scenario} | ${r.rps} | ${r.targetRps} | ${r.p50}ms | ${r.p95}ms | ${r.p99}ms | ${r.errors} | ${status} |`);
  }

  const allPassed = results.every(r => r.passed);
  console.log(`\n${allPassed ? '✅ All benchmarks passed!' : '❌ Some benchmarks failed'}`);
  
  process.exit(allPassed ? 0 : 1);
}

main().catch(console.error);

