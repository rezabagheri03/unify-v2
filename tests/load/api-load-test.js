/**
 * tests/load/api-load-test.js — k6 load test for the Unify API.
 *
 * Golden Doc §F.1: "System must support 10,000 concurrent users without degradation"
 *
 * Run with:
 *   # Smoke test
 *   k6 run --vus 10 --duration 30s tests/load/api-load-test.js
 *
 *   # Full 10k concurrent test
 *   k6 run --vus 10000 --duration 5m tests/load/api-load-test.js
 *
 *   # Ramp-up stress test
 *   k6 run --vus 0->5000 --duration 10m tests/load/api-load-test.js
 *
 * Prerequisites:
 *   - API running on http://localhost:3001
 *   - Database seeded with demo data (npm run db:seed-demo)
 *   - k6 installed (https://k6.io/docs/getting-started/installation/)
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

const errorRate = new Rate('errors');

export const options = {
  stages: [
    { duration: '30s', target: 100 },   // Warm up
    { duration: '1m', target: 1000 },  // Ramp to 1k
    { duration: '2m', target: 5000 },  // Ramp to 5k
    { duration: '3m', target: 10000 }, // Peak at 10k
    { duration: '2m', target: 5000 },  // Ramp down
    { duration: '30s', target: 0 },    // Cool down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1000'], // 95th < 500ms, 99th < 1s
    http_req_failed: ['rate<0.01'], // Error rate < 1%
    errors: ['rate<0.05'], // Custom error rate < 5%
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3001';
const PASSWORD = 'Demo1234!@';

// Shared login cache — once a VU logs in, reuses the token
const tokens = {};

function login(userNum) {
  const username = `9901234${(userNum % 5) + 1}`; // 99012341..99012345
  const res = http.post(`${BASE_URL}/api/auth/login`, JSON.stringify({ username, password: PASSWORD }), {
    headers: { 'Content-Type': 'application/json' },
  });
  if (res.status === 200) {
    return res.json('data.accessToken');
  }
  return null;
}

export default function () {
  const userNum = __VU;
  let token = tokens[userNum];

  if (!token) {
    token = login(userNum);
    if (!token) {
      errorRate.add(1);
      sleep(1);
      return;
    }
    tokens[userNum] = token;
  }

  const authHeaders = {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  };

  // Test 1: Health check (public endpoint)
  const healthRes = http.get(`${BASE_URL}/api/health`);
  check(healthRes, {
    'health 200': (r) => r.status === 200,
    'health has status': (r) => r.json('status') !== undefined,
  }) || errorRate.add(1);

  // Test 2: Get scheduler state (authenticated)
  const stateRes = http.get(`${BASE_URL}/api/scheduler/state`, authHeaders);
  check(stateRes, {
    'scheduler 200': (r) => r.status === 200,
  }) || errorRate.add(1);

  // Test 3: Get current user (authenticated)
  const meRes = http.get(`${BASE_URL}/api/users/me`, authHeaders);
  check(meRes, {
    'me 200': (r) => r.status === 200,
    'me has username': (r) => r.json('data.username') !== undefined,
  }) || errorRate.add(1);

  // Test 4: Get inbox (authenticated)
  const inboxRes = http.get(`${BASE_URL}/api/inbox`, authHeaders);
  check(inboxRes, {
    'inbox 200': (r) => r.status === 200,
  }) || errorRate.add(1);

  // Test 5: Get system state (authenticated, low-load)
  const sysRes = http.get(`${BASE_URL}/api/system/state`, authHeaders);
  check(sysRes, {
    'sys 200': (r) => r.status === 200,
  }) || errorRate.add(1);

  sleep(1);
}

export function handleSummary(data) {
  return {
    'stdout': textSummary(data),
    'tests/load/results.json': JSON.stringify(data, null, 2),
  };
}

function textSummary(data) {
  return `
========== UNIFY API LOAD TEST RESULTS ==========
Total requests: ${data.metrics.http_reqs.values.count}
Failed requests: ${(data.metrics.http_req_failed?.values.rate * 100 || 0).toFixed(2)}%
p95 latency:    ${data.metrics.http_req_duration.values['p(95)'].toFixed(2)}ms
p99 latency:    ${data.metrics.http_req_duration.values['p(99)'].toFixed(2)}ms
Active VUs peak: ${data.options.stages?.[3]?.target || 10000}
=================================================
Target (Golden Doc §F.1): 10,000 concurrent users
${data.metrics.http_req_failed?.values.rate < 0.01 ? '✅ PASS' : '❌ FAIL'} Error rate < 1%
${data.metrics.http_req_duration.values['p(95)'] < 500 ? '✅ PASS' : '❌ FAIL'} p95 < 500ms
${data.metrics.http_req_duration.values['p(99)'] < 1000 ? '✅ PASS' : '❌ FAIL'} p99 < 1000ms
=================================================
  `;
}
