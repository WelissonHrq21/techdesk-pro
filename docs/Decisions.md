# TechDesk Pro - Architecture Decisions

## ADR-001 - Password belongs to Service Order

The equipment password belongs to the Service Order because it can change between different visits.

---

## ADR-002 - One Service Order belongs to one Equipment

Each equipment must have its own Service Order because each one can have a different status, diagnosis, budget and delivery date.

---

## ADR-003 - Accessories belong to Service Order

Accessories belong to the Service Order because they represent what was delivered during that specific visit.

---

## ADR-004 - Budget uses versions

A Service Order can have multiple budget versions to preserve negotiation history.

---

## ADR-005 - Customers, Equipment and Users should be deactivated instead of deleted

Deactivation preserves historical data and prevents loss of important service records.

---

## ADR-006 - Service Orders should be cancelled instead of deleted

Cancelled Service Orders remain available for audit and historical purposes.

---

## ADR-007 - Stock changes must be auditable

Part.stock stores the current balance, while StockMovement records why the balance changed. Direct stock updates through Part create/update endpoints are not allowed. Stock concurrency control should be strengthened before multi-user operation at scale.

---

## ADR-008 - Part consumption is separate from budget approval

An approved budget records what the customer approved, while StockMovement records what was actually consumed during maintenance. Consuming parts is allowed only during IN_MAINTENANCE and only for parts in the latest approved budget. Concurrent consumption limits should be strengthened before multi-user operation at scale.

---

## ADR-009 - Budget revisions are complete snapshots

Each budget revision stores the full commercial proposal that is currently valid. The backend does not merge previous budget versions with new items. A revision cannot remove or reduce a part below what has already been consumed in the Service Order.

---

## ADR-010 - Stock EXIT is currently used for service consumption

StockMovement EXIT with serviceOrderId represents part consumption during maintenance in the current model. Future versions may split stock exits into more specific reasons, such as consumption, loss, return, or manual adjustment.

---

## ADR-011 - Finishing maintenance does not require consuming every budget item

A budget item means the customer approved that part or service, not that it must necessarily be consumed. A Service Order can move from IN_MAINTENANCE to FINISHED even when some approved parts were not used.

---

## ADR-012 - Authenticated requests define the acting user

Operational endpoints use request.user.id from a verified JWT instead of accepting userId in the body. The middleware checks the token and then loads the current user from the database so deactivation and role changes take effect without waiting for token expiration.

---

## ADR-013 - RBAC is split between route authorization and domain authorization

Simple permissions are enforced with authorizeRoles at route level. Service Order status changes are authorized inside the domain service because the allowed roles depend on the specific transition.

---

## ADR-014 - Security audit log is a future concern

Security events such as failed login, forbidden operations, role changes, and user deactivation should be recorded in a dedicated security audit log later. They should not be mixed with ServiceOrderHistory, which describes the operational lifecycle of a service order.

---

## ADR-015 - List endpoints use paginated lightweight payloads

Operational list endpoints return { data, meta } and avoid loading full histories, budgets, accessories, and stock movements. Detailed views remain responsible for complete records.

---

## ADR-016 - Low stock threshold is temporary

The dashboard currently treats parts with stock greater than 0 and less than or equal to 5 as low stock. A configurable minimumStock field can replace this threshold later.

---

## ADR-017 - Search starts with contains queries

The MVP uses case-insensitive contains filters for global search. If data volume grows, evaluate PostgreSQL pg_trgm or full-text search for better performance and ranking.

---

## ADR-018 - Delivered today comes from history

The dashboard counts deliveredToday using ServiceOrderHistory entries with newStatus DELIVERED. This preserves the meaning of delivery even if other timestamps change.

---

## ADR-019 - Production containers run migrations before starting the API

For the MVP, the API container runs `prisma migrate deploy` in `docker-entrypoint.sh` before starting Node. This keeps the application from starting against an incompatible schema. In a scaled environment with multiple API replicas, migrations should become a separate deploy step or one-off job to avoid concurrent migration attempts.

---

## ADR-020 - Seed is a manual bootstrap step

The production container does not run seed automatically on startup. The initial ADMIN user is created with an explicit `docker compose exec api npm run seed` command after the stack is healthy. This avoids inserting bootstrap data on every restart and keeps production startup limited to migrations plus API boot.

---

## ADR-021 - Database rollback is not automatic

Rolling back an API image does not automatically roll back database changes. Future migrations should be backwards compatible when possible, and destructive migrations require a tested backup and restore plan before deploy.

---

## ADR-022 - Production PostgreSQL stays on the internal Docker network

The production compose file does not publish PostgreSQL ports to the host. The API reaches the database through the Compose service name `postgres`. Development access through the host uses `docker-compose.dev.yml`.
