# Load Testing for Converge-NPS

This directory contains load testing scripts to simulate 250 concurrent conference attendees.

> **IMPORTANT: Load tests must ONLY run against local Docker databases.**
> The scripts have built-in safety checks that block execution against non-localhost databases.

## Prerequisites

### 1. Install k6

```bash
# macOS
brew install k6

# Windows (chocolatey)
choco install k6

# Linux (Debian/Ubuntu)
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6

# Or using Docker
docker pull grafana/k6
```

### 2. Start the Backend

Make sure your backend is running:

```bash
# Development
cd backend
npm run dev

# Or with Docker
docker-compose up -d
```

### 3. Seed Load Test Users

Create 250 test users in the Docker database:

```bash
# You MUST specify the Docker database URL explicitly
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/converge_nps" node backend/load-tests/seed-load-test-users.js
```

This creates users with:
- Emails: `loadtest1@nps.edu` through `loadtest250@nps.edu` (strict pattern)
- Password: `LoadTest123!`

> **Safety Note:** The script will refuse to run if DATABASE_URL doesn't contain `localhost` or `127.0.0.1`.

## Running Load Tests

### Quick Test (Smoke Test)

Test with a few users to verify everything works:

```bash
k6 run --vus 5 --duration 30s backend/load-tests/conference-simulation.js
```

### Full Conference Simulation (250 Users)

Run the complete simulation with all scenarios:

```bash
k6 run backend/load-tests/conference-simulation.js
```

### With Docker

```bash
docker run -i grafana/k6 run - <backend/load-tests/conference-simulation.js
```

## Test Scenarios

The load test simulates three realistic conference scenarios:

### 1. Morning Login Rush (0-2 min)
- Simulates everyone logging in at the start of the day
- Ramps from 0 → 50 → 250 → 100 users
- Tests authentication under load

### 2. Steady Conference Activity (2-7 min)
- 100 concurrent users browsing, chatting, networking
- Tests: sessions, connections, messages, projects

### 3. Session Browsing Spikes (3-7 min)
- Simulates breaks between talks when everyone checks the schedule
- Spike patterns: 20 → 150 → 50 → 150 users

## Understanding Results

### Key Metrics to Watch

| Metric | Good | Warning | Bad |
|--------|------|---------|-----|
| `http_req_duration` p95 | < 500ms | 500-1000ms | > 1000ms |
| `http_req_duration` p99 | < 1000ms | 1-2s | > 2s |
| `errors` rate | < 1% | 1-5% | > 5% |
| `http_reqs` | Higher is better | - | - |

### Sample Output

```
     ✓ login successful
     ✓ has access token
     ✓ sessions loaded
     ✓ profile loaded

     checks.........................: 98.50% ✓ 4925  ✗ 75
     data_received..................: 12 MB  200 kB/s
     data_sent......................: 1.5 MB 25 kB/s
     errors.........................: 1.50%  ✓ 75    ✗ 4925
     http_req_duration..............: avg=125ms min=15ms med=95ms max=2.5s p(90)=250ms p(95)=400ms
     http_reqs......................: 5000   83/s
```

### What the Results Mean

- **p95 < 500ms**: 95% of requests complete under 500ms ✅
- **p99 < 1000ms**: 99% of requests complete under 1 second ✅
- **errors < 5%**: Less than 5% of requests fail ✅

## Cleanup

Remove load test users when done:

```bash
# You MUST specify the Docker database URL explicitly
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/converge_nps" node backend/load-tests/cleanup-load-test-users.js
```

> **Safety Note:** The cleanup script:
> - Only runs against localhost databases (blocks non-local DATABASE_URLs)
> - Uses strict pattern matching (`loadtest{number}@nps.edu`) to avoid deleting real users
> - Shows which database it's connected to before making changes

## Troubleshooting

### "Connection refused" errors
- Make sure the backend is running
- Check the BASE_URL is correct

### High error rates
- Check database connection pool limits
- Look at backend logs for errors
- Consider increasing Prisma connection pool

### Slow response times
- Check database query performance
- Look for N+1 queries
- Consider adding database indexes

### Memory issues
- Monitor backend memory usage during tests
- Consider increasing Node.js heap size: `NODE_OPTIONS=--max-old-space-size=4096`
