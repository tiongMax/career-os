import http from 'k6/http';
import { check, fail, group } from 'k6';
import { uuidv4 } from 'https://jslib.k6.io/k6-utils/1.4.0/index.js';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8080';

const QUERIES = [
  'postgres redis backend',
  'golang distributed systems',
  'python machine learning',
  'kubernetes docker',
  'react typescript',
];
const TRACKS = ['backend', 'ai', 'quant', 'general'];

export const options = {
  scenarios: {
    reads: {
      executor: 'ramping-vus',
      exec: 'readPath',
      startVUs: 0,
      stages: [
        { duration: '15s', target: 30 },
        { duration: '60s', target: 30 },
        { duration: '10s', target: 0 },
      ],
    },
    writes: {
      executor: 'ramping-vus',
      exec: 'writePath',
      startVUs: 0,
      stages: [
        { duration: '15s', target: 10 },
        { duration: '60s', target: 10 },
        { duration: '10s', target: 0 },
      ],
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.02'],
    'http_req_duration{name:search}': ['p(95)<100'],
    'http_req_duration{name:list_applications}': ['p(95)<200'],
    'http_req_duration{name:create_application}': ['p(95)<150'],
    'http_req_duration{name:analytics_summary}': ['p(95)<200'],
  },
};

export function setup() {
  const res = http.get(`${BASE_URL}/api/v1/companies`);
  if (res.status !== 200) fail(`could not list companies: ${res.status}`);
  const companies = res.json();
  if (!Array.isArray(companies) || companies.length === 0) {
    fail('no companies seeded — run the seed script before benchmarking');
  }
  return { companyIDs: companies.map((c) => c.id) };
}

export function readPath() {
  group('search', () => {
    const q = QUERIES[Math.floor(Math.random() * QUERIES.length)];
    const res = http.get(`${BASE_URL}/api/v1/search?q=${encodeURIComponent(q)}`, {
      tags: { name: 'search' },
    });
    check(res, { 'search 200': (r) => r.status === 200 });
  });

  group('list applications', () => {
    const res = http.get(`${BASE_URL}/api/v1/applications`, {
      tags: { name: 'list_applications' },
    });
    check(res, { 'list 200': (r) => r.status === 200 });
  });

  group('analytics summary', () => {
    const res = http.get(`${BASE_URL}/api/v1/analytics/summary`, {
      tags: { name: 'analytics_summary' },
    });
    check(res, { 'summary 200': (r) => r.status === 200 });
  });
}

export function writePath(data) {
  const companyID = data.companyIDs[Math.floor(Math.random() * data.companyIDs.length)];
  const track = TRACKS[Math.floor(Math.random() * TRACKS.length)];

  const payload = JSON.stringify({
    company_id: companyID,
    title: `Mixed Bench ${uuidv4().slice(0, 8)}`,
    role_track: track,
    status: 'saved',
  });

  const res = http.post(`${BASE_URL}/api/v1/applications`, payload, {
    headers: { 'Content-Type': 'application/json' },
    tags: { name: 'create_application' },
  });

  check(res, { 'create 201': (r) => r.status === 201 });
}
