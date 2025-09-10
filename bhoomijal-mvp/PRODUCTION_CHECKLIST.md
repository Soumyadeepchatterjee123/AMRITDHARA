# Bhoomijal ‑ Hydro-View  
**Production Deployment Checklist**

> Use the “Status” column to mark each item: ☑ Done ☐ Pending ✖ N/A  

| # | Item | Status | Notes / Evidence |
|---|------|--------|------------------|

## 1  Security Verification

| # | Checklist | Status | Evidence / Link |
|---|-----------|--------|-----------------|
| 1.1 | All dependencies scanned (Trivy, `npm audit`, Snyk) show **0 CRITICAL/HIGH** vulns |  |  |
| 1.2 | OWASP ZAP baseline scan passes with **≤ Medium** alerts |  |  |
| 1.3 | HTTP security headers (CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy) validated in staging |  |  |
| 1.4 | JWT secrets, DB passwords, API keys stored in **KMS/Secrets Manager**, not committed to git |  |  |
| 1.5 | TLS certificates valid & auto-renew (Let’s Encrypt / ACM) |  |  |
| 1.6 | Rate-limiting and brute-force protection enabled (`/auth/*`) |  |  |
| 1.7 | CSRF protection tested on state-changing routes |  |  |
| 1.8 | Database user least-privilege: no `SUPERUSER`, only required grants |  |  |
| 1.9 | Backup encryption at-rest & in-transit verified |  |  |
| 1.10 | VAPT / CERT-In audit report signed-off |  |  |

## 2  Performance Optimization

| # | Checklist | Status | Evidence |
|---|-----------|--------|----------|
| 2.1 | Front-end bundle size **< 500 kB** entrypoint, chunks split |  |  |
| 2.2 | Lighthouse scores ≥ 85 (Perf), ≥ 90 (PWA/Best-Practices/SEO) |  |  |
| 2.3 | API p95 latency **< 300 ms** for `/stations/*` |  |  |
| 2.4 | DB query plans reviewed, no full-table scans on critical paths |  |  |
| 2.5 | Auto-scaling (HPA) thresholds configured for CPU / RPS |  |  |
| 2.6 | CDN caching & gzip/brotli compression enabled for static assets |  |  |
| 2.7 | WebSocket / SSE connections tested under 1 k concurrent clients |  |  |
| 2.8 | k6 load test passes target TPS with ≤ 1 % error rate |  |  |

## 3  Accessibility Compliance (WCAG 2.1 AA)

| # | Checklist | Status | Evidence |
|---|-----------|--------|----------|
| 3.1 | **Pa11y-CI** / **axe** audits show 0 errors, ≤ 10 warnings |  |  |
| 3.2 | Color contrast ratio meets AA (checked via utils) |  |  |
| 3.3 | Keyboard navigation & visible focus indicators validated |  |  |
| 3.4 | Skip-to-main-content link present & functional |  |  |
| 3.5 | Live regions announce dynamic updates |  |  |
| 3.6 | Images & icons have descriptive `alt` text |  |  |
| 3.7 | Forms include labels, error messages with ARIA |  |  |
| 3.8 | High-contrast mode detection usable |  |  |
| 3.9 | Hindi/English language tags set correctly |  |  |

## 4  Testing Completion

| # | Checklist | Status | Evidence |
|---|-----------|--------|----------|
| 4.1 | Front-end unit test coverage ≥ 90 % statements |  |  |
| 4.2 | Back-end unit test coverage ≥ 90 % lines |  |  |
| 4.3 | End-to-end Cypress suite green on staging |  |  |
| 4.4 | Integration tests (API ↔ DB) pass in CI |  |  |
| 4.5 | ErrorBoundary tests cover render, retry, report |  |  |
| 4.6 | Regression test baseline snapshot approved |  |  |

## 5  Infrastructure Readiness

| # | Checklist | Status | Evidence |
|---|-----------|--------|----------|
| 5.1 | Docker images signed & stored in GHCR/ECR |  |  |
| 5.2 | Kubernetes manifests templated (`envsubst`/Helm) |  |  |
| 5.3 | Production namespace quotas & RBAC configured |  |  |
| 5.4 | PostgreSQL High Availability (primary + replica) |  |  |
| 5.5 | Redis persistence & AOF enabled |  |  |
| 5.6 | Automated nightly DB backups to S3, retention 30 d |  |  |
| 5.7 | Disaster-recovery runbook tested (restore drill) |  |  |
| 5.8 | CDN / WAF configured (e.g., CloudFront / AWS WAF) |  |  |
| 5.9 | Logging pipeline (Loki/Fluent Bit) shipping to central store |  |  |

## 6  Monitoring & Alerting Verification

| # | Checklist | Status | Evidence |
|---|-----------|--------|----------|
| 6.1 | Prometheus targets healthy, scrape success > 99 % |  |  |
| 6.2 | Alertmanager routes to email + Slack, test alert received |  |  |
| 6.3 | Grafana dashboards for Groundwater, API, DB, Infra |  |  |
| 6.4 | Custom groundwater rules firing correctly on synthetic data |  |  |
| 6.5 | Loki log labels structured (`traceID`, `user_id`) |  |  |
| 6.6 | Jaeger tracing sampling 10 % enabled |  |  |
| 6.7 | Uptime probe (Blackbox) covers `/health.txt` & `/api/v1/health` |  |  |

## 7  Documentation Completeness

| # | Checklist | Status | Evidence |
|---|-----------|--------|----------|
| 7.1 | README + Architecture diagrams updated to current release |  |  |
| 7.2 | API OpenAPI spec versioned and published |  |  |
| 7.3 | ADRs written for key design decisions |  |  |
| 7.4 | On-call runbooks & SOPs in `docs/runbooks/` |  |  |
| 7.5 | Changelog generated (`vX.Y.Z`) |  |  |
| 7.6 | Storybook deployed for component library |  |  |
| 7.7 | License & third-party notices included |  |  |

## 8  Government Compliance (India)

| # | Checklist | Status | Evidence |
|---|-----------|--------|----------|
| 8.1 | **GIGW 3.0** self-assessment form submitted |  |  |
| 8.2 | Data classification & retention complies with NDSAP |  |  |
| 8.3 | Hindi localisation verified (mandatory govt pages) |  |  |
| 8.4 | Hosting within MeitY-empanelled cloud region |  |  |
| 8.5 | Aadhaar/PII not stored; DPDP 2023 checklist signed |  |  |
| 8.6 | CERT-In compliant logging & 90-day retention |  |  |
| 8.7 | Accessibility statement & privacy policy published |  |  |
| 8.8 | Source code released under OSI-approved license (MIT) |  |  |

---

### Final Go/No-Go

| Decision | By | Date | Notes |
|----------|----|------|-------|
| **GO / NO-GO** | Product Owner | | |

*All mandatory items must be ☑ Done before production cut-over.*  
