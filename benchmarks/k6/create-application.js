import http from 'k6/http';
import { check, fail } from 'k6';
import { uuidv4 } from 'https://jslib.k6.io/k6-utils/1.4.0/index.js';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8080';

const TRACKS = ['backend', 'ai', 'quant', 'general'];
const SOURCES = ['linkedin', 'referral', 'company_site', 'recruiter', 'cold_email'];

export const options = {
  scenarios: {
    create_apps: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '10s', target: 10 },
        { duration: '30s', target: 10 },
        { duration: '5s', target: 0 },
      ],
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<150'],
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

export default function (data) {
  const companyID = data.companyIDs[Math.floor(Math.random() * data.companyIDs.length)];
  const track = TRACKS[Math.floor(Math.random() * TRACKS.length)];
  const source = SOURCES[Math.floor(Math.random() * SOURCES.length)];

  const payload = JSON.stringify({
    company_id: companyID,
    title: `Bench Engineer ${uuidv4().slice(0, 8)}`,
    role_track: track,
    source,
    status: 'saved',
  });

  const res = http.post(`${BASE_URL}/api/v1/applications`, payload, {
    headers: { 'Content-Type': 'application/json' },
    tags: { name: 'create_application' },
  });

  check(res, {
    'status is 201': (r) => r.status === 201,
    'has id': (r) => !!r.json('id'),
  });
}
