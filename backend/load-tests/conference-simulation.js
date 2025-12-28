import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const loginDuration = new Trend('login_duration');
const sessionsDuration = new Trend('sessions_list_duration');
const profileDuration = new Trend('profile_duration');
const connectionsDuration = new Trend('connections_duration');

// Configuration
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000/api/v1';

// Test scenarios simulating 250 conference attendees
export const options = {
  scenarios: {
    // Scenario 1: Morning rush - everyone logs in
    morning_login: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 50 },   // Ramp up to 50 users
        { duration: '1m', target: 250 },   // Peak: 250 users logging in
        { duration: '30s', target: 100 },  // Settle to 100 active
      ],
      gracefulRampDown: '10s',
      exec: 'loginScenario',
    },

    // Scenario 2: Steady conference usage
    conference_activity: {
      executor: 'constant-vus',
      vus: 100,                            // 100 concurrent active users
      duration: '5m',
      startTime: '2m',                     // Start after login rush
      exec: 'conferenceActivity',
    },

    // Scenario 3: Session browsing spikes (between talks)
    session_browsing: {
      executor: 'ramping-vus',
      startVUs: 20,
      stages: [
        { duration: '1m', target: 150 },   // Spike during break
        { duration: '2m', target: 50 },    // During session
        { duration: '1m', target: 150 },   // Another break
      ],
      startTime: '3m',
      exec: 'browseSessionsScenario',
    },
  },

  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1000'], // 95% under 500ms, 99% under 1s
    errors: ['rate<0.05'],                           // Less than 5% errors
    login_duration: ['p(95)<1000'],                  // Login under 1s
    sessions_list_duration: ['p(95)<300'],           // Sessions list under 300ms
    profile_duration: ['p(95)<200'],                 // Profile under 200ms
    connections_duration: ['p(95)<300'],             // Connections under 300ms
  },
};

// Test users - these should be pre-seeded in the database
const TEST_USERS = [];
for (let i = 1; i <= 250; i++) {
  TEST_USERS.push({
    email: `loadtest${i}@nps.edu`,
    password: 'LoadTest123!',
  });
}

// Get a user based on VU number
function getUser() {
  const userIndex = (__VU - 1) % TEST_USERS.length;
  return TEST_USERS[userIndex];
}

// Login and get token
function login() {
  const user = getUser();
  const startTime = Date.now();

  const res = http.post(
    `${BASE_URL}/auth/login`,
    JSON.stringify(user),
    {
      headers: { 'Content-Type': 'application/json' },
      tags: { name: 'login' },
    }
  );

  loginDuration.add(Date.now() - startTime);

  const success = check(res, {
    'login successful': (r) => r.status === 200,
    'has access token': (r) => r.json('accessToken') !== undefined,
  });

  errorRate.add(!success);

  if (success) {
    return res.json('accessToken');
  }
  return null;
}

// Authenticated request helper
function authRequest(method, url, body, token, tags = {}) {
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  };

  if (method === 'GET') {
    return http.get(url, { headers, tags });
  } else if (method === 'POST') {
    return http.post(url, JSON.stringify(body), { headers, tags });
  }
}

// Scenario 1: Login flow
export function loginScenario() {
  const token = login();

  if (token) {
    // After login, users typically fetch their profile
    const startTime = Date.now();
    const profileRes = authRequest('GET', `${BASE_URL}/users/me`, null, token, { name: 'get_profile' });
    profileDuration.add(Date.now() - startTime);

    check(profileRes, {
      'profile loaded': (r) => r.status === 200,
    });
  }

  sleep(Math.random() * 2 + 1); // 1-3 second think time
}

// Scenario 2: Typical conference activity
export function conferenceActivity() {
  const token = login();
  if (!token) return;

  group('Browse Sessions', () => {
    const startTime = Date.now();
    const res = authRequest('GET', `${BASE_URL}/sessions`, null, token, { name: 'list_sessions' });
    sessionsDuration.add(Date.now() - startTime);

    const success = check(res, {
      'sessions loaded': (r) => r.status === 200,
    });
    errorRate.add(!success);

    // View a specific session
    if (res.status === 200) {
      const sessions = res.json('data') || res.json();
      if (sessions && sessions.length > 0) {
        const randomSession = sessions[Math.floor(Math.random() * sessions.length)];
        if (randomSession && randomSession.id) {
          const detailRes = authRequest('GET', `${BASE_URL}/sessions/${randomSession.id}`, null, token, { name: 'session_detail' });
          check(detailRes, {
            'session detail loaded': (r) => r.status === 200,
          });
        }
      }
    }
  });

  sleep(Math.random() * 3 + 2); // 2-5 second think time

  group('Check Connections', () => {
    const startTime = Date.now();
    const res = authRequest('GET', `${BASE_URL}/connections`, null, token, { name: 'list_connections' });
    connectionsDuration.add(Date.now() - startTime);

    const success = check(res, {
      'connections loaded': (r) => r.status === 200,
    });
    errorRate.add(!success);
  });

  sleep(Math.random() * 2 + 1);

  group('Check Messages', () => {
    const res = authRequest('GET', `${BASE_URL}/messages/conversations`, null, token, { name: 'list_conversations' });
    check(res, {
      'conversations loaded': (r) => r.status === 200,
    });

    // Check unread count
    const unreadRes = authRequest('GET', `${BASE_URL}/messages/unread-count`, null, token, { name: 'unread_count' });
    check(unreadRes, {
      'unread count loaded': (r) => r.status === 200,
    });
  });

  sleep(Math.random() * 3 + 2);

  group('Browse Projects', () => {
    const res = authRequest('GET', `${BASE_URL}/projects`, null, token, { name: 'list_projects' });
    check(res, {
      'projects loaded': (r) => r.status === 200,
    });
  });

  sleep(Math.random() * 2 + 1);
}

// Scenario 3: Session browsing (heavy during breaks)
export function browseSessionsScenario() {
  const token = login();
  if (!token) return;

  // Rapid session browsing
  for (let i = 0; i < 3; i++) {
    const startTime = Date.now();
    const res = authRequest('GET', `${BASE_URL}/sessions`, null, token, { name: 'list_sessions' });
    sessionsDuration.add(Date.now() - startTime);

    check(res, {
      'sessions loaded': (r) => r.status === 200,
    });

    sleep(Math.random() * 1.5 + 0.5); // Quick browsing
  }

  // Check personal schedule
  const scheduleRes = authRequest('GET', `${BASE_URL}/sessions/my-schedule`, null, token, { name: 'my_schedule' });
  check(scheduleRes, {
    'schedule loaded': (r) => r.status === 200,
  });

  sleep(Math.random() * 2 + 1);
}

// Default function (if no scenario specified)
export default function () {
  conferenceActivity();
}
