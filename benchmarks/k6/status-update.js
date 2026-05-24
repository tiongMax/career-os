import http from 'k6/http';
import { check, fail } from 'k6';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8080';

const NEXT_STATUS = {
  saved: 'applied',
  applied: 'recruiter_screen',
  recruiter_screen: 'technical_screen',
  technical_screen: 'onsite',
  onsite: 'offer',
};

export const options = {
  scenarios: {
    status_updates: {
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
    http_req_failed: ['rate<0.02'],
    http_req_duration: ['p(95)<100'],
  },
};

export function setup() {
  const res = http.get(`${BASE_URL}/api/v1/applications`);
  if (res.status !== 200) fail(`could not list applications: ${res.status}`);
  const apps = res.json();
  if (!Array.isArray(apps) || apps.length === 0) {
    fail('no applications seeded — run the seed script before benchmarking');
  }
  const candidates = apps.filter((a) => NEXT_STATUS[a.status]);
  if (candidates.length === 0) {
    fail('no applications in a non-terminal status — re-seed');
  }
  return { apps: candidates.map((a) => ({ id: a.id, status: a.status })) };
}

export default function (data) {
  const app = data.apps[Math.floor(Math.random() * data.apps.length)];
  const next = NEXT_STATUS[app.status];
  if (!next) return;

  const res = http.patch(
    `${BASE_URL}/api/v1/applications/${app.id}/status`,
    JSON.stringify({ status: next }),
    {
      headers: { 'Content-Type': 'application/json' },
      tags: { name: 'status_update' },
    },
  );

  // 200 on success, 409 if some other VU already advanced this app — both are acceptable.
  check(res, {
    'status is 200 or 409': (r) => r.status === 200 || r.status === 409,
  });
}
