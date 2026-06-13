# Load Testing — k6 Scripts

Per **Golden Doc §F.1**: "System must support 10,000 concurrent users without degradation"

## Prerequisites

```bash
# Install k6
# macOS:   brew install k6
# Linux:   sudo apt install k6
# Windows: choco install k6
# Or see:  https://k6.io/docs/getting-started/installation/

# Make sure the system is running with demo data
npm run db:seed-demo
docker-compose -f docker/docker-compose.yml up -d
```

## Tests

### 1. Smoke Test (30 seconds, 10 users)
```bash
k6 run --vus 10 --duration 30s tests/load/api-load-test.js
```

### 2. Full 10k Concurrent Test (8 minutes)
```bash
k6 run tests/load/api-load-test.js
```

### 3. Custom Profile
```bash
# Test against remote server
k6 run -e BASE_URL=https://staging.unify.ac.ir tests/load/api-load-test.js

# Longer test with more aggressive ramp-up
k6 run --vus 0->15000 --duration 15m tests/load/api-load-test.js
```

## Performance Targets (Golden Doc §F.1)

| Metric | Target | How k6 reports it |
|---|---|---|
| Page Load Time | < 3s | `http_req_duration` p95 |
| API Response (p95) | < 500ms | `http_req_duration` p(95)` |
| API Response (p99) | < 1000ms | `http_req_duration` p(99)` |
| Error Rate | < 1% | `http_req_failed` |
| Concurrent Users | 10,000 | `vus` parameter |

## Test Coverage

The load test exercises the **most-used authenticated endpoints**:

1. `GET /api/health` — public
2. `GET /api/scheduler/state` — student dashboard data
3. `GET /api/users/me` — profile fetch
4. `GET /api/inbox` — messages
5. `GET /api/system/state` — current phase/semester

It does NOT cover:
- File uploads (heaviest operation — would saturate disk)
- BullMQ jobs (background — not on request path)
- Login itself (handled separately by auth flows)

## Tuning for Production

Before running against production:

```bash
# Warm connection pool (gradual ramp-up)
k6 run --vus 0->10000 --duration 10m tests/load/api-load-test.js

# Long-duration soak test
k6 run --vus 5000 --duration 1h tests/load/api-load-test.js

# Capture results
k6 run tests/load/api-load-test.js --out json=results.json
```

## Infrastructure Recommendations

To sustain 10,000 concurrent connections:

| Component | Setting |
|---|---|
| API instances | 4 (PM2 cluster mode) |
| Postgres connections | 200 (50 per instance) |
| Redis pool | 50 per instance |
| Nginx worker connections | 4096 |
| Node.js max-old-space-size | 2GB per instance |
