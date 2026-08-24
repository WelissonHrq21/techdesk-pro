# TechDesk Manager CLI contract v1

This document defines the structured JSON interface owned by TechDesk Pro and consumed by TechDesk Manager. It is additive: the existing human CLI remains the operator interface. Mutating commands are individually enumerated and remain reachable only through the privileged Manager helper.

## Commands and capabilities

The following exact invocations are supported:

```text
/opt/techdesk-pro/techdesk status --json
/opt/techdesk-pro/techdesk diagnostics --json
/opt/techdesk-pro/techdesk backup-list --json
/opt/techdesk-pro/techdesk backup --json
/opt/techdesk-pro/techdesk backup-check --id sha256:DIGEST --json
/opt/techdesk-pro/techdesk restore-check --id sha256:DIGEST --json
```

Every response advertises `cliSchema: "1.0"` and these capabilities:

- `status.v1`
- `diagnostics.v1`
- `backup-list.v1`
- `backup.v1`
- `backup-check.v1`
- `restore-check.v1`

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

Only direct regular files below the fixed backup root are considered. Symlinks, non-canonical names, malformed metadata, and unreadable entries are excluded. No filesystem path is returned. Trusted validation metadata is read from root-protected, atomically replaced sidecars and must match digest, canonical name, and size; otherwise validation remains `UNKNOWN` / `VALIDATION_NOT_RECORDED`.

## `backup --json`

This is the only structured backup creation command. It performs PostgreSQL availability and disk-capacity preflight, creates a custom-format dump under a hidden temporary name, checks it with `pg_restore -l`, calculates SHA256, applies mode `0600`, syncs it, and atomically renames it within the canonical backup directory. A failed or interrupted operation removes the temporary host artifact and never exposes it through `backup-list`.

The successful response contains `data.backup` with only `backupId`, canonical display name, creation timestamp, byte size, and SHA256. Absolute paths, container names, database credentials, and raw tool output are excluded. Disk exhaustion and operational failures use stable codes such as `BACKUP_DISK_SPACE_LOW`, `BACKUP_POSTGRES_UNAVAILABLE`, and `BACKUP_VALIDATION_FAILED`.

## `backup-check --id ... --json`

The only accepted identifier is exactly `sha256:` followed by 64 lowercase hexadecimal characters. The CLI resolves it inside the fixed backup root, rejects symlinks and non-canonical names, verifies regular-file identity/size/checksum, validates custom dump format with `pg_restore -l`, and revalidates identity and digest after the check. Validation metadata is then atomically persisted.

Traversal, absolute paths, nulls, option-like values, Unicode variants, unknown IDs, checksum drift, and format corruption fail closed with stable codes. No caller-supplied filename or path is accepted.

## `restore-check --id ... --json`

Restore-check first applies the complete backup-check policy, then copies the selected canonical dump into the PostgreSQL container and restores it only into a uniquely named `techdesk_restore_check_*` temporary database. It validates Prisma migration evidence, critical tables, and basic relationships. The temporary database and container file must be removed before success is emitted; cleanup failure returns `RESTORE_CHECK_CLEANUP_FAILED`.

The production database is never dropped, renamed, overwritten, migrated, or selected as the restore target. The response reports only the backup metadata and the fixed isolation evidence `TEMPORARY`, `productionDatabaseTouched: false`, and `cleanup: PASS`.

## Backup identity, metadata, and atomicity

The filesystem and CLI remain the canonical authority for backup existence and bytes. `backupId` is derived from content and Manager SQLite never becomes backup authority. Root-protected validation metadata records only digest, canonical name, size, check time, state, and stable code; corrupt or inconsistent metadata is ignored.

Disk preflight requires at least twice the measured database size plus 64 MiB, with a 256 MiB minimum. It runs before `pg_dump` and never attempts automatic deletion or cleanup of older backups.

## Security boundary

All structured commands:

- do not use sudo or elevate privileges;
- do not require Docker-group or Docker-socket access;
- never expose setup logs or protected `.env` contents;
- never return secrets, process environments, raw Docker inspection, raw command output, customer data, or arbitrary paths;
- accept no browser-supplied path, filename, filter, command, environment, cwd, or executable.

The three mutating/expensive backup commands necessarily use the protected environment internally through the official operational scripts, but their envelopes and logs are reconstructed/redacted and contain no secret-bearing raw output. The read-only status, diagnostics, and backup-list commands retain their original no-`.env`-content behavior.

Diagnostics evidence is constructed by allowlist. Output redaction is not treated as a substitute for the contract.

## Compatibility

Schema ownership belongs to TechDesk Pro. Consumers support the declared major version. Unknown majors must be rejected. A consumer may accept a newer `1.x` minor only when required v1 fields validate and unknown fields are ignored; it should report that combination as unverified. Removing or changing a required v1 field requires a new major version.
