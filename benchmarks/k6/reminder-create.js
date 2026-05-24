import http from 'k6/http';
import { check, fail } from 'k6';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8080';

export const options = {
  scenarios: {
    create_reminders: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '10s', target: 15 },
        { duration: '30s', target: 15 },
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
  const res = http.get(`${BASE_URL}/api/v1/applications`);
  if (res.status !== 200) fail(`could not list applications: ${res.status}`);
  const apps = res.json();
  if (!Array.isArray(apps) || apps.length === 0) {
    fail('no applications seeded — run the seed script before benchmarking');
  }
  return { applicationIDs: apps.map((a) => a.id) };
}

export default function (data) {
  const applicationID =
    data.applicationIDs[Math.floor(Math.random() * data.applicationIDs.length)];

  // Schedule reminders 1–10 minutes in the future so the worker can pick them up later.
  const minutes = 1 + Math.floor(Math.random() * 10);
  const dueAt = new Date(Date.now() + minutes * 60 * 1000).toISOString();

  const payload = JSON.stringify({
    application_id: applicationID,
    title: 'Follow up with recruiter',
    description: 'k6 generated reminder',
    due_at: dueAt,
  });

  const res = http.post(`${BASE_URL}/api/v1/reminders`, payload, {
    headers: { 'Content-Type': 'application/json' },
    tags: { name: 'create_reminder' },
  });

  check(res, {
    'status is 201': (r) => r.status === 201,
    'has id': (r) => !!r.json('id'),
  });
}
