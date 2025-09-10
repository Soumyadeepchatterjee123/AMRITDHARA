# AMRITDHARA – Bhoomijal Hydro-View MVP

India’s open-source decision-support platform for **real-time groundwater monitoring, analytics & reporting**.

---

## 1. Project Vision

Groundwater sustains more than 60 % of India’s irrigation and over 85 % of its drinking-water supply.  
AMRITDHARA (Advanced Monitoring & Real-time Intelligence for **T**errestrial **H**ydro-resources & **A**nalytics) delivers:

* Live telemetry from 2 000+ piezometers nation-wide  
* Interactive map & battery visualisation of aquifer health  
* Historical time-series analysis, forecasting & CSV/PDF exports  
* WCAG 2.1 AA compliant, bilingual UI (English / Hindi)  
* OpenAPI endpoints to power research & community innovation  

The repository contains the **production-ready Hydro-View MVP** that will be the reference implementation for State Ground-Water Departments and the Central Ground Water Board (CGWB).

---

## 2. Repository Structure

```
.
├── README.md                  ← you are here
└── bhoomijal-mvp/             ← complete Hydro-View application
    ├── frontend/              ← React 18 + TypeScript UI, Material-UI, Leaflet
    ├── backend/               ← FastAPI REST API, SQLAlchemy, Celery tasks
    ├── monitoring/            ← Prometheus rules, Grafana dashboards, exporters
    ├── docker-compose.yml     ← Dev / Prod stack launcher
    ├── .github/workflows/     ← CI/CD pipeline (lint, test, build, deploy)
    ├── PRODUCTION_CHECKLIST.md← Go-live verification sheet
    └── ...                    ← docs, k8s manifests, etc.
```

---

## 3. Quick-Start (Local Development)

Prerequisites: **Docker 20+** & **docker-compose v2**.

```bash
# 1. Clone the official repo
git clone https://github.com/Soumyadeepchatterjee123/AMRITDHARA.git
cd AMRITDHARA

# 2. Copy environment template & edit as needed
cp .env.example .env

# 3. Fire up the entire stack (frontend + backend + db + grafana etc.)
docker compose --profile dev up --build

# 4. Open in browser
#    Frontend UI:        http://localhost:3000
#    API & Swagger:      http://localhost:8000/api/v1/docs
#    Grafana dashboards: http://localhost:3001  (admin / admin)
```

_For a lightweight frontend-only run:_

```bash
cd bhoomijal-mvp/frontend
npm ci
npm run dev   # hot-reload at http://localhost:3000
```

---

## 4. Documentation & Resources

| Topic | Link |
|-------|------|
| System architecture diagram | `docs/assets/architecture.png` |
| API specification (OpenAPI) | `http://localhost:8000/api/v1/docs` or `bhoomijal-mvp/backend/openapi.json` |
| Developer guide | `docs/developer_guide.md` |
| Deployment guide (K8s) | `k8s/README.md` |
| Monitoring & alert rules | `bhoomijal-mvp/monitoring/prometheus/` |
| Production checklist | `PRODUCTION_CHECKLIST.md` |

---

## 5. Government of India Context

The platform aligns with:

* **GIGW 3.0** web guidelines – accessibility, performance, security  
* **NDSAP / ODC-BY** licensing for open spatial data  
* **Digital Personal Data Protection Act 2023** – zero PII storage  
* **CERT-In** incident reporting & 90-day log retention

Deployment targets MeitY-empanelled cloud regions; container images are signed and vulnerability-scanned (Trivy).

---

## 6. Technology Stack Overview

| Layer | Technology |
|-------|------------|
| UI | React 18, TypeScript, Vite/webpack, Material-UI v5, Leaflet, Chart.js |
| API | FastAPI 0.111, Pydantic 2, JWT Auth, OpenAPI 3.1 |
| Data | PostgreSQL 14 + PostGIS 3.3, Redis 7 cache/queue |
| Analytics | Pandas, SciPy, Prophet (optional  forecast) |
| DevOps | Docker multi-stage, GitHub Actions, K8s manifests |
| Observability | Prometheus, Grafana, Loki, Alertmanager |
| Testing | Vitest + Testing-Library, Pytest, Cypress, Pa11y-CI |

---

## 7. Contributing

We welcome contributions from State agencies, researchers and OSS volunteers.  
Please read `CONTRIBUTING.md`, follow the Conventional Commits style and ensure `npm run ci` & `pytest` pass before opening a PR.

---

## 8. License

Released under the **MIT License** © 2025 Government of India / San Francisco AI Factory.  
See `LICENSE` for full terms.
