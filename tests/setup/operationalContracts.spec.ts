import { spawnSync, type SpawnSyncReturns } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const deploy = join(root, "deploy");

function directShell() { return spawnSync("sh", ["-c", "exit 0"], { stdio: "ignore" }).status === 0; }
function shellPath(path: string) { return directShell() ? path : path.replace(/^([A-Za-z]):\\/, (_m, drive: string) => `/mnt/${drive.toLowerCase()}/`).replace(/\\/g, "/"); }
function quote(value: string) { return `'${value.replace(/'/g, `'\\''`)}'`; }

const fakeDocker = `#!/bin/sh
set -eu
all="$*"
case "\${1:-}" in
  --version) echo "Docker version 27.0.0"; exit 0 ;;
  info) [ "\${TEST_DOCKER_DOWN:-0}" = 1 ] && { echo "daemon unavailable" >&2; exit 1; }; exit 0 ;;
  ps)
    case "$all" in *postgres*) [ "\${TEST_POSTGRES_DOWN:-0}" = 1 ] && echo "Exited (1)" || echo "Up 1 minute (healthy)";; *) echo "test-container";; esac
    exit 0 ;;
  volume) echo "test-volume"; exit 0 ;;
  compose)
    case "$all" in
      *" version"*) [ "\${TEST_COMPOSE_DOWN:-0}" = 1 ] && exit 1; echo "Docker Compose version v2.30.0"; exit 0 ;;
      *" ps --services --filter status=running"*) [ "\${TEST_PARTIAL_STACK:-0}" = 1 ] && printf "postgres\\napi\\n" || printf "postgres\\napi\\nfrontend\\n"; exit 0 ;;
      *" restart"*) touch "$TEST_RUNTIME/action-ran"; [ "\${TEST_RESTART_FAIL:-0}" = 1 ] && { echo 'JWT_SECRET=knownsecret POSTGRES_PASSWORD=knownsecret2 DATABASE_URL=postgresql://user:secret@db/x Bearer abc.def.ghi' >&2; exit 1; }; exit 0 ;;
      *" pull"*) [ "\${TEST_PULL_FAIL:-0}" = 1 ] && exit 1; exit 0 ;;
      *" up -d"*) touch "$TEST_RUNTIME/action-ran"; exit 0 ;;
      *" config"*|*" exec -T api"*|*" logs"*|*" ps"*) exit 0 ;;
    esac ;;
esac
exit 1
`;

const fakeCurl = `#!/bin/sh
set -eu
if [ "\${TEST_HEALTH_FAIL_AFTER_ACTION:-0}" = 1 ] && [ -f "$TEST_RUNTIME/action-ran" ]; then exit 1; fi
case "$*" in
  */health*) [ "\${TEST_FRONTEND_DOWN:-0}" = 1 ] && exit 1 ;;
  */api/ready*) { [ "\${TEST_API_DOWN:-0}" = 1 ] || [ "\${TEST_POSTGRES_DOWN:-0}" = 1 ]; } && exit 1 ;;
esac
exit 0
`;

const fakeDate = `#!/bin/sh
set -eu
if [ "\${1:-}" = "+%s" ]; then
  value=0; [ ! -f "$TEST_RUNTIME/date-counter" ] || value="$(cat "$TEST_RUNTIME/date-counter")"
  value=$((value + 30)); printf '%s\\n' "$value" > "$TEST_RUNTIME/date-counter"; printf '%s\\n' "$value"; exit 0
fi
exec /bin/date "$@"
`;

const fakeDf = `#!/bin/sh
printf 'Filesystem 1024-blocks Used Available Capacity Mounted on\n'
printf 'test 20000000 1000000 19000000 5%% /\n'
`;

function runScenario(operations: string, environment: Record<string, string> = {}): SpawnSyncReturns<string> {
  const names = ["techdesk", "setup-core.sh", "observability.sh", "backup-contracts.sh", "operational-contracts.sh", "restart.sh", "_lib.sh", "docker-compose.yml", "VERSION"];
  const files = names.map((name) => shellPath(join(deploy, name)));
  const script = [
    "set -eu", 'runtime="$(mktemp -d)"', 'trap \'chmod -R u+rwX "$runtime" 2>/dev/null || true; rm -rf "$runtime"\' EXIT',
    'mkdir -p "$runtime/bin" "$runtime/logs" "$runtime/backups"',
    ...names.map((name, index) => `cp "\${${index + 1}}" "$runtime/${name}"`),
    `printf "%s" "\${${names.length + 1}}" > "$runtime/bin/docker"`,
    `printf "%s" "\${${names.length + 2}}" > "$runtime/bin/curl"`,
    `printf "%s" "\${${names.length + 3}}" > "$runtime/bin/date"`,
    `printf "%s" "\${${names.length + 4}}" > "$runtime/bin/df"`,
    'printf \'#!/bin/sh\\nexit 0\\n\' > "$runtime/bin/sleep"',
    'printf "TECHDESK_PORT=8080\\nTECHDESK_PROJECT_NAME=test\\nTECHDESK_VERSION=1.2.0\\nPOSTGRES_USER=techdesk\\nPOSTGRES_DB=techdesk\\nJWT_SECRET=knownsecret\\nPOSTGRES_PASSWORD=knownsecret2\\n" > "$runtime/.env"',
    'printf \'%s\\n\' \'{"installationId":"public","version":"1.2.0","projectName":"test","frontendPort":"8080"}\' > "$runtime/techdesk-installation.json"',
    'chmod 755 "$runtime/techdesk" "$runtime"/*.sh "$runtime/bin"/*', 'chmod 600 "$runtime/.env"',
    'export TEST_RUNTIME="$runtime" TECHDESK_RUNTIME_ROOT="$runtime" PATH="$runtime/bin:$PATH"', operations,
  ].join("\n");
  const args = [...files, fakeDocker, fakeCurl, fakeDate, fakeDf].map(quote).join(" ");
  const exports = Object.entries(environment).map(([key, value]) => `export ${key}=${quote(value)}`).join("\n");
  if (directShell()) return spawnSync("sh", ["-c", `${exports}\nset -- ${args}\n${script}`], { cwd: root, encoding: "utf8" });
  const directory = mkdtempSync(join(tmpdir(), "techdesk-operational-contract-"));
  const runner = join(directory, "run.sh");
  writeFileSync(runner, `#!/bin/sh\n${exports}\nset -- ${args}\n${script}\n`);
  try { return spawnSync("wsl", ["sh", shellPath(runner)], { cwd: root, encoding: "utf8" }); }
  finally { rmSync(directory, { recursive: true, force: true }); }
}

function jsonLine(result: SpawnSyncReturns<string>) {
  expect(result.status, result.stderr).toBe(0);
  expect(result.stdout.trim().split(/\r?\n/)).toHaveLength(1);
  return JSON.parse(result.stdout) as Record<string, any>;
}

describe("structured restart and repair CLI contracts", () => {
  it("declares only implemented stack restart and repair capabilities", () => {
    const value = jsonLine(runScenario('"$runtime/techdesk" status --json'));
    expect(value.data.capabilities).toEqual(expect.arrayContaining(["restart.stack.v1", "repair.v1"]));
    expect(value.data.capabilities).not.toEqual(expect.arrayContaining(["restart.api.v1", "restart.frontend.v1"]));
  }, 30_000);

  it("restarts the official stack and reports strict post-action health", () => {
    const value = jsonLine(runScenario('"$runtime/techdesk" restart --target stack --json', { TEST_PULL_FAIL: "1" }));
    expect(value).toMatchObject({ command: "restart", ok: true, result: "PASS", code: "RESTART_STACK_COMPLETE" });
    expect(value.data).toMatchObject({ operation: "RESTART_STACK", target: "stack", health: "PASS", offline: { state: "SUPPORTED" }, after: { overall: "HEALTHY", expectedContainersRunning: true } });
    expect(value.data.phases.map((phase: { id: string }) => phase.id)).toEqual(["PRECHECK", "RESTARTING", "WAITING_FOR_SERVICES", "VERIFYING_HEALTH", "COMPLETE"]);
    expect(JSON.stringify(value)).not.toMatch(/knownsecret|knownsecret2|postgresql:\/\/|Bearer|\/tmp\//i);
  }, 30_000);

  it("runs the official repair and declares its registry dependency", () => {
    const value = jsonLine(runScenario('"$runtime/techdesk" repair --json'));
    expect(value).toMatchObject({ command: "repair", ok: true, code: "REPAIR_COMPLETE" });
    expect(value.data).toMatchObject({ operation: "REPAIR", target: null, health: "PASS", offline: { state: "NETWORK_REQUIRED" } });
    expect(value.data.phases.map((phase: { id: string }) => phase.id)).toEqual(["PRECHECK", "REPAIRING", "VERIFYING_RUNTIME", "VERIFYING_HEALTH", "COMPLETE"]);
    expect(value.warnings).toContainEqual(expect.objectContaining({ code: "REPAIR_NETWORK_DEPENDENCY" }));
  }, 30_000);

  it("maps Docker, Compose, execution, pull and post-health failures to stable pure JSON", () => {
    const scenarios: Array<[string, Record<string, string>, string]> = [
      ['"$runtime/techdesk" restart --target stack --json', { TEST_DOCKER_DOWN: "1" }, "RESTART_DOCKER_UNAVAILABLE"],
      ['"$runtime/techdesk" restart --target stack --json', { TEST_COMPOSE_DOWN: "1" }, "RESTART_COMPOSE_UNAVAILABLE"],
      ['"$runtime/techdesk" restart --target stack --json', { TEST_RESTART_FAIL: "1" }, "RESTART_EXECUTION_FAILED"],
      ['"$runtime/techdesk" restart --target stack --json', { TEST_HEALTH_FAIL_AFTER_ACTION: "1" }, "RESTART_POST_HEALTH_FAILED"],
      ['"$runtime/techdesk" restart --target stack --json', { TEST_FRONTEND_DOWN: "1" }, "RESTART_POST_HEALTH_FAILED"],
      ['"$runtime/techdesk" restart --target stack --json', { TEST_API_DOWN: "1" }, "RESTART_POST_HEALTH_FAILED"],
      ['"$runtime/techdesk" restart --target stack --json', { TEST_POSTGRES_DOWN: "1" }, "RESTART_POST_HEALTH_FAILED"],
      ['"$runtime/techdesk" restart --target stack --json', { TEST_PARTIAL_STACK: "1" }, "RESTART_POST_HEALTH_FAILED"],
      ['"$runtime/techdesk" repair --json', { TEST_PULL_FAIL: "1" }, "REPAIR_IMAGE_PULL_FAILED"],
      ['"$runtime/techdesk" repair --json', { TEST_HEALTH_FAIL_AFTER_ACTION: "1" }, "REPAIR_POST_HEALTH_FAILED"],
    ];
    for (const [command, environment, code] of scenarios) {
      const value = jsonLine(runScenario(command, environment));
      expect(value).toMatchObject({ ok: false, result: "FAIL", code });
      expect(JSON.stringify(value)).not.toMatch(/knownsecret|knownsecret2|postgresql:\/\/|Bearer|stdout|stderr/i);
    }
  }, 60_000);

  it("maps missing runtime, permission mismatch and incoherent metadata without destructive recovery", () => {
    const scenarios: Array<[string, string]> = [
      ['rm -f "$runtime/.env"; "$runtime/techdesk" restart --target stack --json', "RESTART_RUNTIME_MISSING"],
      ['chmod 500 "$runtime/logs"; "$runtime/techdesk" restart --target stack --json', "RESTART_PERMISSION_DENIED"],
      ['printf "{broken" > "$runtime/techdesk-installation.json"; sed -i "s/TECHDESK_VERSION=1.2.0/TECHDESK_VERSION=9.9.9/" "$runtime/.env"; "$runtime/techdesk" repair --json', "REPAIR_METADATA_FAILED"],
    ];
    for (const [script, code] of scenarios) {
      const value = jsonLine(runScenario(script));
      expect(value).toMatchObject({ ok: false, result: "FAIL", code });
      expect(JSON.stringify(value)).not.toMatch(/knownsecret|postgresql:\/\/|stdout|stderr|\/tmp\//i);
    }
  }, 30_000);

  it("keeps human commands and rejects arbitrary targets and options", () => {
    const human = runScenario('"$runtime/techdesk" restart; "$runtime/techdesk" repair');
    expect(human.status, human.stderr).toBe(0);
    expect(human.stdout).toContain("Repair concluido");
    expect(human.stdout).not.toContain('"schemaVersion"');
    const hostile = runScenario('! "$runtime/techdesk" restart --target postgres --json; ! "$runtime/techdesk" restart --target "api;rm" --json; ! "$runtime/techdesk" repair --command whoami');
    expect(hostile.status, hostile.stderr).toBe(0);
    expect(hostile.stdout).not.toContain("knownsecret");
  }, 30_000);
});
