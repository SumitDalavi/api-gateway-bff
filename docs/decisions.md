# Architectural Decisions for api-gateway-bff

## 1. Storage Backend Selection
- **Context**: Need a lightweight way to maintain state for this prototype.
- **Decision**: Use in-memory state and mocked endpoints instead of a dedicated PostgreSQL/Redis instance.
- **Trade-offs**: 
  - *Pros*: Extremely fast to deploy, no external dependencies, zero cost.
  - *Cons*: Cannot survive restarts, cannot scale horizontally, does not test real network latencies or database locking behaviors.

## ADR-002: Progressive Credential Loading (PCL) Architecture
- **Context:** Production hardening required live backends (PostgreSQL, Redis, OpenAI, Anthropic), but removing mocks would break CI pipelines and create high developer onboarding friction.
- **Decision:** Implement Progressive Credential Loading. Keep in-memory and local mock heuristics as the default safe baseline, while wrapping external integrations in auto-promoting factory adapters triggered by environment variables.
- **Consequences:** 
  - *Pros:* 100% CI pass rate without requiring external secrets; zero setup friction for new contributors; progressive upgrade to production clusters.
  - *Cons:* Adds lightweight factory abstraction layers and runtime credential detection logic.
