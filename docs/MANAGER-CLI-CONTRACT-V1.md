# TechDesk Manager CLI contract v1

This document defines the read-only JSON interface owned by TechDesk Pro and consumed by TechDesk Manager. It is an additive interface: the existing human CLI remains the operator interface.

## Commands and capabilities

The following exact invocations are supported:

```text
/opt/techdesk-pro/techdesk status --json
/opt/techdesk-pro/techdesk diagnostics --json
/opt/techdesk-pro/techdesk backup-list --json
```

Every response advertises `cliSchema: "1.0"` and these capabilities:

- `status.v1`
- `diagnostics.v1`
- `backup-list.v1`

Capability discovery is explicit. Consumers must not infer a capability from the installed product version.

## Envelope

Successful command dispatch writes exactly one JSON object followed by a newline to stdout:

```json
{
  "schemaVersion": "1.0",
  "command": "status",
  "requestId": "cli-1787522400000-1234",
  "startedAt": "2026-08-23T22:00:00Z",
  "finishedAt": "2026-08-23T22:00:01Z",
  "durationMs": 1000,
  "ok": true,
  "result": "PASS",
  "code": "STATUS_COMPLETE",
  "data": {},
  "warnings": [],
  "errors": []
}
```

Timestamps are UTC RFC 3339. `result` is `PASS`, `WARNING`, or `FAIL`. Codes are stable machine identifiers. Operational failure is represented in the envelope rather than by human text on stdout. Invalid CLI syntax or failure to dispatch the runtime remains a non-zero process error.

## `status --json`

`data` contains:

- `cliSchema` and `capabilities`;
- `techdesk`: installation, evidence-based version, overall state, frontend, API, PostgreSQL, and current URL;
- `server`: uptime, up to 16 safe IPv4 addresses, fixed-path disk capacity, Docker state/version, and Compose state/version;
- `backup`: timestamp of the latest canonical backup and its recorded validation state.

Overall states are `HEALTHY`, `DEGRADED`, `UNHEALTHY`, `NOT_INSTALLED`, `PARTIAL`, `UNKNOWN`, and `UNAVAILABLE`. Component states use coherent subsets including `READY`, `DOWN`, `RUNNING`, `AVAILABLE`, `PERMISSION_DENIED`, and `UNAVAILABLE`.

Absence of evidence never produces `HEALTHY`. API readiness is direct database-query evidence; Docker evidence is used only when it is available. Docker permission denial degrades container observations without requiring privilege. Version resolution is metadata, then public `VERSION`, then `UNKNOWN`; health cannot override missing or inconsistent version evidence.

Network output excludes loopback, link-local, Docker bridge, veth, and common container interfaces. The disk path is always `/opt/techdesk-pro`; arbitrary paths and mount options are not returned.

## `diagnostics --json`

Diagnostics is synchronous and read-only. `data.checks` is an allowlisted array. Each check contains:

- category and stable ID;
- `PASS`, `WARNING`, `FAIL`, or `SKIPPED`;
- stable code, safe summary, recommended action, duration;
- a small allowlisted evidence object.

Checks cover CLI/schema capability, runtime and installation markers, metadata and public version, version coherence, `.env` existence/mode only, Docker/Compose, frontend, API, PostgreSQL, listener, disk/inodes, latest backup, and restore-check capability. Restore-check is never executed by diagnostics.

## `backup-list --json`

The command returns at most 50 newest canonical regular files. A valid item has the exact display-name form `backup-inicial-producao-YYYY-MM-DD_HH-MM-SS.dump`, a `sha256:<digest>` backup ID, creation time, size, digest, and validation metadata.

Only direct regular files below the fixed backup root are considered. Symlinks, non-canonical names, malformed metadata, and unreadable entries are excluded. No filesystem path is returned. Validation is `UNKNOWN` / `VALIDATION_NOT_RECORDED` until a future trusted persistence contract records restore-check results.

## Security boundary

These commands:

- do not use sudo or elevate privileges;
- do not require Docker-group or Docker-socket access;
- do not create setup logs or mutate installation state;
- do not source or read `.env` contents;
- never return secrets, process environments, raw Docker inspection, raw command output, customer data, or arbitrary paths;
- accept no browser-supplied path, filename, filter, command, or executable.

Diagnostics evidence is constructed by allowlist. Output redaction is not treated as a substitute for the contract.

## Compatibility

Schema ownership belongs to TechDesk Pro. Consumers support the declared major version. Unknown majors must be rejected. A consumer may accept a newer `1.x` minor only when required v1 fields validate and unknown fields are ignored; it should report that combination as unverified. Removing or changing a required v1 field requires a new major version.
