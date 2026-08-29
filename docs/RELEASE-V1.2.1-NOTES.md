# TechDesk Pro v1.2.1 release notes

TechDesk Pro v1.2.1 is a patch release focused on operational compatibility
with TechDesk Manager. It does not add business features, change the database
schema, or alter the published v1.2.0 release.

## Operational contracts

The production CLI exposes schema `1.0` and the following explicit
capabilities:

- `status.v1`
- `diagnostics.v1`
- `backup-list.v1`
- `backup.v1`
- `backup-check.v1`
- `restore-check.v1`
- `restart.stack.v1`
- `repair.v1`

Machine-readable commands emit one JSON document on stdout. Diagnostics and
errors are structured, sensitive values are redacted, and privileged
operations remain constrained to the existing installer and runtime boundary.

## Reliability and security

- POSIX deploy files are normalized to LF and validated in tests.
- PostgreSQL backup readiness has a bounded, deterministic CI harness.
- Backup creation, validation, restore-check, restart, and repair retain their
  fail-closed behavior and structured result contracts.
- PostgreSQL and the API remain private behind the production Compose network;
  only the frontend is published.

## Compatibility

TechDesk Manager may treat final version `1.2.1` as a supported release only
when schema `1.0` and all eight capabilities above are present. Missing or
unknown contract requirements must remain blocked.

## Upgrade

The supported upgrade path starts from the official v1.2.0 setup artifact,
creates and validates a backup, applies the versioned v1.2.1 images, runs
migrations, and verifies health. Existing database data, secrets, volumes, and
installation identity are preserved.

The final v1.2.1 tag, release, and images are intentionally outside RC1
preparation.
