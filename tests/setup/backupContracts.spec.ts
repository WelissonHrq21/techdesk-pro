import { spawnSync, type SpawnSyncReturns } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const deploy = join(root, "deploy");

function hasDirectShell() {
  return spawnSync("sh", ["-c", "exit 0"], { stdio: "ignore" }).status === 0;
}

function shellPath(path: string) {
  if (hasDirectShell()) return path;
  return path.replace(/^([A-Za-z]):\\/, (_match, drive: string) => `/mnt/${drive.toLowerCase()}/`).replace(/\\/g, "/");
}

function quote(value: string) {
  return `'${value.replace(/'/g, `'\\''`)}'`;
}

const fakeDocker = `#!/bin/sh
set -eu
all="$*"
case "\${1:-}" in
  info) exit 0 ;;
  compose)
    case "$all" in
      *" version"*) exit 0 ;;
      *"pg_database_size"*) printf '1024\\n'; exit 0 ;;
      *" pg_dump "*)
        if [ "\${TEST_SECRET_FAIL:-0}" = 1 ]; then
          echo 'JWT_SECRET=knownsecret POSTGRES_PASSWORD=knownsecret2 DATABASE_URL=postgresql://user:secret@db/x Bearer abc.def.ghi' >&2
          exit 1
        fi
        exit 0 ;;
      *" ps -q postgres"*) printf 'fake-postgres\\n'; exit 0 ;;
      *" dropdb "*) [ "\${TEST_CLEANUP_FAIL:-0}" = 1 ] && exit 1; exit 0 ;;
      *" createdb "*) [ "\${TEST_TEMP_FAIL:-}" = createdb ] && exit 1; exit 0 ;;
      *" pg_restore "*) [ "\${TEST_TEMP_FAIL:-}" = restore ] && exit 1; exit 0 ;;
      *" psql "*) [ "\${TEST_TEMP_FAIL:-}" = schema ] && exit 1; exit 0 ;;
      *) exit 0 ;;
    esac ;;
  cp)
    source="$2"; target="$3"
    case "$source" in fake-postgres:*) printf 'VALID_DUMP' > "$target" ;; esac
    exit 0 ;;
  run)
    backup_name=""
    for argument in "$@"; do case "$argument" in /backups/*) backup_name="\${argument#/backups/}" ;; esac; done
    if [ -n "$backup_name" ] && [ -f "$TEST_RUNTIME/backups/$backup_name" ] && grep -q CORRUPT "$TEST_RUNTIME/backups/$backup_name"; then exit 1; fi
    exit 0 ;;
esac
exit 1
`;

const fakeDf = `#!/bin/sh
if [ "\${TEST_LOW_DISK:-0}" = 1 ]; then
  printf 'Filesystem 1024-blocks Used Available Capacity Mounted on\\n/dev/test 100 99 1 99%% /\\n'
else
  exec /bin/df "$@"
fi
`;

function runScenario(operations: string, environment: Record<string, string> = {}): SpawnSyncReturns<string> {
  const files = [
    "techdesk", "setup-core.sh", "observability.sh", "backup-contracts.sh", "backup.sh",
    "restore-check.sh", "_lib.sh", "docker-compose.yml",
  ].map((name) => shellPath(join(deploy, name)));
  const script = [
    "set -eu",
    'runtime="$(mktemp -d)"',
    'trap \'chmod -R u+rwX "$runtime" 2>/dev/null || true; rm -rf "$runtime"\' EXIT',
    'mkdir -p "$runtime/bin" "$runtime/logs" "$runtime/backups"',
    ...files.map((_, index) => `cp "$${index + 1}" "$runtime/${["techdesk", "setup-core.sh", "observability.sh", "backup-contracts.sh", "backup.sh", "restore-check.sh", "_lib.sh", "docker-compose.yml"][index]}"`),
    'printf "1.2.0\\n" > "$runtime/VERSION"',
    'printf "POSTGRES_USER=techdesk\\nPOSTGRES_DB=techdesk\\nJWT_SECRET=knownsecret\\nPOSTGRES_PASSWORD=knownsecret2\\n" > "$runtime/.env"',
    'printf \'%s\\n\' \'{"installationId":"public","version":"1.2.0","projectName":"test","frontendPort":"8080"}\' > "$runtime/techdesk-installation.json"',
    'printf "%s" "$9" > "$runtime/bin/docker"',
    'printf "%s" "${10}" > "$runtime/bin/df"',
    'chmod 755 "$runtime/techdesk" "$runtime"/*.sh "$runtime/bin"/*',
    'chmod 600 "$runtime/.env"',
    'export TEST_RUNTIME="$runtime" TECHDESK_RUNTIME_ROOT="$runtime"',
    'export PATH="$runtime/bin:$PATH"',
    operations,
  ].join("\n");
  const args = [...files, fakeDocker, fakeDf].map(quote).join(" ");
  const exports = Object.entries(environment).map(([key, value]) => `export ${key}=${quote(value)}`).join("\n");
  if (hasDirectShell()) {
    return spawnSync("sh", ["-c", `${exports}\nset -- ${args}\n${script}`], { cwd: root, encoding: "utf8" });
  }
  const runnerDirectory = mkdtempSync(join(tmpdir(), "techdesk-backup-contract-"));
  const runner = join(runnerDirectory, "run.sh");
  writeFileSync(runner, `#!/bin/sh\n${exports}\nset -- ${args}\n${script}\n`);
  try {
    return spawnSync("wsl", ["sh", shellPath(runner)], { cwd: root, encoding: "utf8" });
  } finally {
    rmSync(runnerDirectory, { recursive: true, force: true });
  }
}

function lines(result: SpawnSyncReturns<string>) {
  expect(result.status, result.stderr).toBe(0);
  return Object.fromEntries(result.stdout.trim().split(/\r?\n/).map((line) => {
    const separator = line.indexOf("=");
    return [line.slice(0, separator), JSON.parse(line.slice(separator + 1)) as Record<string, unknown>];
  }));
}

describe("structured backup CLI contracts", () => {
  it("creates atomically, validates, restore-checks and persists canonical metadata", () => {
    const result = runScenario([
      'created="$("$runtime/techdesk" backup --json)"',
      'printf "CREATE=%s\\n" "$created"',
      'backup_id="$(printf "%s" "$created" | sed -n \'s/.*"backupId":"\\(sha256:[a-f0-9]\\{64\\}\\)".*/\\1/p\')"',
      'printf "LIST=%s\\n" "$("$runtime/techdesk" backup-list --json)"',
      'printf "CHECK=%s\\n" "$("$runtime/techdesk" backup-check --id "$backup_id" --json)"',
      'printf "RESTORE=%s\\n" "$("$runtime/techdesk" restore-check --id "$backup_id" --json)"',
      'test "$(find "$runtime/backups" -maxdepth 1 -name ".backup-in-progress-*" | wc -l)" -eq 0',
    ].join("\n"));
    const output = lines(result);
    expect(output.CREATE).toMatchObject({ command: "backup", ok: true, code: "BACKUP_CREATED" });
    expect(output.LIST).toMatchObject({ command: "backup-list", data: { returned: 1 } });
    expect(output.CHECK).toMatchObject({ command: "backup-check", ok: true, code: "BACKUP_CHECK_PASSED" });
    expect(output.RESTORE).toMatchObject({ command: "restore-check", ok: true, code: "RESTORE_CHECK_PASSED", data: { isolation: { database: "TEMPORARY", productionDatabaseTouched: false, cleanup: "PASS" } } });
    expect(result.stdout).not.toMatch(/\/tmp\/|\/backups\/|knownsecret|DATABASE_URL|POSTGRES_PASSWORD|JWT_SECRET/);
  });

  it("blocks hostile IDs, symlink escape, corrupt format and checksum drift", () => {
    const result = runScenario([
      'for hostile in "../../etc/shadow" "/etc/shadow" "--help" "sha256:abc" "sha256:$(printf a%.0s $(seq 1 65))"; do',
      '  printf "HOSTILE=%s\\n" "$("$runtime/techdesk" backup-check --id "$hostile" --json)"',
      'done',
      'outside="$runtime/outside.dump"; printf "outside" > "$outside"; ln -s "$outside" "$runtime/backups/backup-inicial-producao-2026-08-24_01-02-03.dump"',
      'outside_id="sha256:$(sha256sum "$outside" | awk \'{print $1}\')"',
      'printf "SYMLINK=%s\\n" "$("$runtime/techdesk" backup-check --id "$outside_id" --json)"',
      'corrupt="$runtime/backups/backup-inicial-producao-2026-08-24_02-03-04.dump"; printf "CORRUPT" > "$corrupt"',
      'corrupt_id="sha256:$(sha256sum "$corrupt" | awk \'{print $1}\')"',
      'printf "CORRUPT=%s\\n" "$("$runtime/techdesk" backup-check --id "$corrupt_id" --json)"',
      'printf "RESTORE_CORRUPT=%s\\n" "$("$runtime/techdesk" restore-check --id "$corrupt_id" --json)"',
      'original="$runtime/backups/backup-inicial-producao-2026-08-24_03-04-05.dump"; printf "original" > "$original"',
      'digest="$(sha256sum "$original" | awk \'{print $1}\')"; size="$(stat -c %s "$original")"; mkdir -p "$runtime/backups/.metadata"',
      'printf "1|%s|%s|%s|2026-08-24T00:00:00Z|PASS|BACKUP_CHECK_PASSED\\n" "$digest" "$(basename "$original")" "$size" > "$runtime/backups/.metadata/$digest.meta"',
      'printf "changed" > "$original"',
      'printf "DRIFT=%s\\n" "$("$runtime/techdesk" backup-check --id "sha256:$digest" --json)"',
    ].join("\n"));
    expect(result.status, result.stderr).toBe(0);
    const parsed = result.stdout.trim().split(/\r?\n/).map((line) => JSON.parse(line.slice(line.indexOf("=") + 1)) as Record<string, unknown>);
    expect(parsed.slice(0, 5).every((item) => item.code === "BACKUP_ID_INVALID")).toBe(true);
    expect(parsed[5]?.code).toBe("BACKUP_NOT_FOUND");
    expect(parsed[6]?.code).toBe("BACKUP_FORMAT_INVALID");
    expect(parsed[7]?.code).toBe("BACKUP_FORMAT_INVALID");
    expect(parsed[8]?.code).toBe("BACKUP_CHECKSUM_MISMATCH");
  });

  it("fails before pg_dump on low disk and never leaks operational secrets", () => {
    const low = lines(runScenario('printf "LOW=%s\\n" "$("$runtime/techdesk" backup --json)"', { TEST_LOW_DISK: "1" }));
    expect(low.LOW).toMatchObject({ ok: false, code: "BACKUP_DISK_SPACE_LOW", data: { backup: null } });

    const secret = runScenario('printf "SECRET=%s\\n" "$("$runtime/techdesk" backup --json)"; ! grep -R "knownsecret\\|knownsecret2\\|postgresql://user:secret\\|abc.def.ghi" "$runtime/logs"', { TEST_SECRET_FAIL: "1" });
    const output = lines(secret);
    expect(output.SECRET).toMatchObject({ ok: false, code: "BACKUP_CREATE_FAILED" });
    expect(secret.stdout + secret.stderr).not.toMatch(/knownsecret|postgresql:\/\/user:secret|abc\.def\.ghi/);
  });

  it("reports isolated cleanup failure without claiming success", () => {
    const result = runScenario([
      'created="$("$runtime/techdesk" backup --json)"',
      'backup_id="$(printf "%s" "$created" | sed -n \'s/.*"backupId":"\\(sha256:[a-f0-9]\\{64\\}\\)".*/\\1/p\')"',
      'export TEST_CLEANUP_FAIL=1',
      'printf "CLEANUP=%s\\n" "$("$runtime/techdesk" restore-check --id "$backup_id" --json)"',
    ].join("\n"));
    expect(lines(result).CLEANUP).toMatchObject({ ok: false, code: "RESTORE_CHECK_CLEANUP_FAILED" });
  });

  it("maps temporary database, restore and schema failures to stable codes", () => {
    const expected: Record<string, string> = {
      createdb: "RESTORE_CHECK_TEMP_POSTGRES_FAILED",
      restore: "RESTORE_CHECK_RESTORE_FAILED",
      schema: "RESTORE_CHECK_SCHEMA_FAILED",
    };
    for (const [failure, code] of Object.entries(expected)) {
      const result = runScenario([
        'created="$("$runtime/techdesk" backup --json)"',
        'backup_id="$(printf "%s" "$created" | sed -n \'s/.*"backupId":"\\(sha256:[a-f0-9]\\{64\\}\\)".*/\\1/p\')"',
        `export TEST_TEMP_FAIL=${failure}`,
        'printf "FAILURE=%s\\n" "$("$runtime/techdesk" restore-check --id "$backup_id" --json)"',
      ].join("\n"));
      expect(lines(result).FAILURE).toMatchObject({ ok: false, code });
    }
  });

  it("preserves the human backup command output", () => {
    const result = runScenario('"$runtime/techdesk" backup');
    expect(result.status, result.stderr).toBe(0);
    expect(result.stdout).toContain("Backup criado:");
    expect(result.stdout).toContain("SHA256:");
    expect(() => JSON.parse(result.stdout)).toThrow();
  });
});
