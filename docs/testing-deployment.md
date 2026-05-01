# Testing and Deployment

Projects should be cheap to test and straightforward to scale.

## Test Layers

Each project chooses the layers it needs:

- Unit tests for domain logic.
- Integration tests for adapters, persistence, and external boundaries.
- End-to-end tests for critical user or system flows.
- Deployment tests that provision only what is needed, run checks, and tear down.

## On-Demand Deployment Tests

Deployment tests should:

- Run only when requested or scheduled.
- Create temporary infrastructure or use an explicitly disposable environment.
- Tear down infrastructure after checks complete.
- Keep secrets outside the repository.
- Emit enough logs to diagnose failures without leaving expensive resources idle.

## Cost Model

Default posture:

- Near-zero idle cost.
- Pay only during test execution or real use.
- Prefer managed services that can sleep, scale to zero, or be created
  temporarily.

## Scaling Model

When a project grows, document how to increase:

- Runtime CPU and memory.
- Database size and IOPS.
- Worker concurrency.
- Network limits.
- Log and metric retention.

