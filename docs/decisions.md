# Architectural Decisions for api-gateway-bff

## 1. Storage Backend Selection
- **Context**: Need a lightweight way to maintain state for this prototype.
- **Decision**: Use in-memory state and mocked endpoints instead of a dedicated PostgreSQL/Redis instance.
- **Trade-offs**: 
  - *Pros*: Extremely fast to deploy, no external dependencies, zero cost.
  - *Cons*: Cannot survive restarts, cannot scale horizontally, does not test real network latencies or database locking behaviors.
