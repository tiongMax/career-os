import http from 'k6/http';
import { check } from 'k6';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8080';

const QUERIES = [
  'postgres redis backend',
  'golang distributed systems',
  'python machine learning',
  'kubernetes docker',
  'react typescript',
  'system design',
  'rust low latency',
  'rag llm vector',
];

export const options = {
  scenarios: {
    search_load: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '15s', target: 20 },
        { duration: '45s', target: 20 },
        { duration: '10s', target: 0 },
      ],
      gracefulRampDown: '5s',
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<100', 'p(99)<200'],
  },
};

export default function () {
  const q = QUERIES[Math.floor(Math.random() * QUERIES.length)];
  const res = http.get(`${BASE_URL}/api/v1/search?q=${encodeURIComponent(q)}`, {
    tags: { name: 'search' },
  });
  check(res, {
    'status is 200': (r) => r.status === 200,
    'has results array': (r) => Array.isArray(r.json('results') ?? r.json()),
  });
}
