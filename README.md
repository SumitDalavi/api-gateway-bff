# API Gateway / BFF 🌉

> Backend-For-Frontend (BFF) gateway aggregating multiple microservices and providing GraphQL-like data fetching.

## The Problem
Modern distributed systems require robust, highly concurrent solutions. Simple CRUD applications fail when subjected to high throughput, race conditions, or massive data sets.

## The Solution
This project implements a production-grade microservice architecture designed to handle these specific edge cases. By utilizing advanced paradigms like idempotency keys, advisory locks, or optimized caching layers, this service guarantees data integrity under load.

```text
┌──────────────┐      ┌───────────────┐      ┌───────────────┐
│              │      │               │      │               │
│   Client     │─────►│   API Layer   │─────►│  Data Store   │
│              │      │               │      │               │
└──────────────┘      └───────────────┘      └───────────────┘
```

## 🛠️ Tech Stack
- **Core Technology**: Node.js, Express, Redis
- **Architecture**: Microservices, Event-Driven

## Decision Log
| Decision | Rationale |
|----------|-----------|
| Monorepo vs Polyrepo | Chosen self-contained repository for easier deployment and PoC demonstration |
| State Management | All state is pushed to the Data Store/Cache to keep the API stateless and horizontally scalable |
| Error Handling | Standardized JSON error responses with explicit error codes |

## 🚀 Step-by-Step Setup

```bash
# 1. Clone the repository
git clone https://github.com/SumitDalavi/api-gateway-bff.git
cd api-gateway-bff

# 2. Build and start
docker-compose up -d --build

# 3. Verify it's running
curl http://localhost:8080/health
```

The API is now available at **http://localhost:8080**

## 🧪 Usage & Demo

```bash
# Health Check
curl http://localhost:8080/health

# Simulate Traffic
curl -X POST http://localhost:8080/api/trigger -H "Content-Type: application/json" -d '{"test":"payload"}'
```

## ✅ Verification

| Check | Command | Expected |
|-------|---------|----------|
| Health | `curl http://localhost:8080/health` | `{"status": "ok"}` |
| Load | `make test` | All unit/integration tests pass |

## 👨‍💻 Author
**Sumit Dalavi** — Senior DevSecOps / Platform Engineer
[GitHub](https://github.com/SumitDalavi) | [LinkedIn](https://in.linkedin.com/in/sumit-dalavi-762838129)

---
*Built with a focus on production-grade patterns, not toy demos.*
