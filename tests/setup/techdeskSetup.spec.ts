import { spawnSync, type SpawnSyncReturns } from "node:child_process";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

const root = process.cwd();
const deployDir = join(root, "deploy");
const techdeskScript = join(deployDir, "techdesk");
const setupCoreScript = join(deployDir, "setup-core.sh");
const composeFile = join(deployDir, "docker-compose.yml");
const packageScript = join(deployDir, "package.sh");

const linuxRuntimeFiles = [
  "techdesk",
  "setup-core.sh",
  "install.sh",
  "start.sh",
  "stop.sh",
  "restart.sh",
  "status.sh",
  "backup.sh",
  "restore-check.sh",
  "_lib.sh",
  "docker-compose.yml",
  "seed-admin.js",
  "VERSION",
  ".env.example",
  "README-INSTALL.md",
  "README-BACKUP-RESTORE.md",
  join("nginx", "default.conf"),
];

function hasShell() {
  const result = spawnSync("sh", ["-c", "exit 0"], {
    stdio: "ignore",
  });

  if (result.status === 0) {
    return true;
  }

  return hasWslShell();
}

function hasDirectShell() {
  const result = spawnSync("sh", ["-c", "exit 0"], {
    stdio: "ignore",
  });

  return result.status === 0;
}

function hasWslShell() {
  const result = spawnSync("wsl", ["sh", "-lc", "exit 0"], {
    stdio: "ignore",
  });

  return result.status === 0;
}

function toShellPath(path: string) {
  if (hasDirectShell()) {
    return path;
  }

  return path.replace(/^([A-Za-z]):\\/, (_match, drive: string) => {
    return `/mnt/${drive.toLowerCase()}/`;
  }).replace(/\\/g, "/");
}

function fromShellPath(
  path: string,
  shellMode: "native" | "wsl" = hasDirectShell() ? "native" : "wsl"
) {
  if (shellMode === "native") {
    return path;
  }

  return path.replace(
    /^\/mnt\/([a-z])\/(.*)$/,
    (_match, drive: string, rest: string) =>
      `${drive.toUpperCase()}:\\${rest.replace(/\//g, "\\")}`
  );
}

function shellQuote(value: string) {
  return `'${value.replace(/'/g, `'\\''`)}'`;
}

function runShellCommand(
  script: string,
  args: string[] = [],
  env: Record<string, string> = {},
  cwd = root
): SpawnSyncReturns<string> {
  if (hasDirectShell()) {
    const argSetup = args.map((arg) => shellQuote(arg)).join(" ");
    const scriptWithArgs = `${argSetup ? `set -- ${argSetup}; ` : ""}${script}`;

    return spawnSync("sh", ["-c", scriptWithArgs, "techdesk-setup-test"], {
      cwd,
      encoding: "utf8",
      env: {
        ...process.env,
        ...env,
      },
    });
  }

  const exports = Object.entries(env)
    .map(([key, value]) => `export ${key}=${shellQuote(value)}`)
    .join("\n");
  const argSetup = args.map((arg) => shellQuote(toShellPath(arg))).join(" ");
  const scriptWithArgs = `${argSetup ? `set -- ${argSetup}; ` : ""}${script}`;
  const tempScript = join(
    mkdtempSync(join(tmpdir(), "techdesk-shell-runner-")),
    "run.sh"
  );
  writeFileSync(
    tempScript,
    [
      "#!/bin/sh",
      "set -eu",
      `cd ${shellQuote(toShellPath(cwd))}`,
      exports,
      scriptWithArgs,
    ].filter(Boolean).join("\n")
  );

  return spawnSync("wsl", ["sh", toShellPath(tempScript)], {
    encoding: "utf8",
  });
}

function hasDockerCompose() {
  const result = hasDirectShell()
    ? spawnSync("sh", ["-c", "docker compose version >/dev/null 2>&1"], {
        stdio: "ignore",
      })
    : spawnSync(
        "wsl",
        ["sh", "-lc", "docker compose version >/dev/null 2>&1"],
        { stdio: "ignore" }
      );

  return result.status === 0;
}

function createFakeDeployRoot() {
  const fakeRoot = mkdtempSync(join(tmpdir(), "techdesk-setup-"));

  mkdirSync(join(fakeRoot, "nginx"), { recursive: true });
  copyFileSync(composeFile, join(fakeRoot, "docker-compose.yml"));
  copyFileSync(join(deployDir, "VERSION"), join(fakeRoot, "VERSION"));
  copyFileSync(join(deployDir, "seed-admin.js"), join(fakeRoot, "seed-admin.js"));
  copyFileSync(
    join(deployDir, "nginx", "default.conf"),
    join(fakeRoot, "nginx", "default.conf")
  );

  return fakeRoot;
}

function createFakeInstallerSource() {
  const fakeRoot = mkdtempSync(join(tmpdir(), "techdesk-installer-source-"));

  for (const file of linuxRuntimeFiles) {
    const destination = join(fakeRoot, file);
    mkdirSync(dirname(destination), { recursive: true });
    copyFileSync(join(deployDir, file), destination);
  }

  return fakeRoot;
}

describe("TechDesk setup bootstrapper", () => {
  it("keeps shell path conversion separated from native Node filesystem paths", () => {
    expect(fromShellPath("/tmp/techdesk-setup/logs/setup.log", "native")).toBe(
      "/tmp/techdesk-setup/logs/setup.log"
    );
    expect(
      fromShellPath("/mnt/c/Users/welis/AppData/Local/Temp/setup.log", "wsl")
    ).toBe("C:\\Users\\welis\\AppData\\Local\\Temp\\setup.log");
  });

  it("keeps production compose on versioned images and private PostgreSQL", () => {
    const compose = readFileSync(composeFile, "utf8");

    expect(compose).toContain("ghcr.io/welissonhrq21/techdesk-pro-api:1.1.1");
    expect(compose).toContain(
      "ghcr.io/welissonhrq21/techdesk-pro-frontend:1.1.1"
    );
    expect(compose).not.toMatch(/:latest\b/);
    const postgresBlock = compose.match(/postgres:[\s\S]*?\n  api:/)?.[0] ?? "";
    expect(postgresBlock).not.toContain("ports:");
  });

  it("does not include destructive production operations in setup scripts", () => {
    const setup = [
      readFileSync(techdeskScript, "utf8"),
      readFileSync(setupCoreScript, "utf8"),
    ].join("\n");

    expect(setup).not.toMatch(/down\s+-v/);
    expect(setup).not.toMatch(/migrate\s+reset/);
    expect(setup).not.toMatch(/docker\s+volume\s+rm/);
    expect(setup).not.toMatch(/rm\s+-rf\s+.*(pgdata|postgres|volume)/);
  });

  it("documents metadata without storing technical or user secrets", () => {
    const setup = setupCoreScript
      ? readFileSync(setupCoreScript, "utf8")
      : "";
    const metadataBlock = setup.match(/write_metadata\(\)[\s\S]*?^}/m)?.[0];

    expect(metadataBlock).toBeDefined();
    expect(metadataBlock).toContain("installationId");
    expect(metadataBlock).toContain("version");
    expect(metadataBlock).toContain("frontendPort");
    expect(metadataBlock).not.toContain("POSTGRES_PASSWORD");
    expect(metadataBlock).not.toContain("JWT_SECRET");
    expect(metadataBlock).not.toContain("ADMIN_PASSWORD");
  });

  it.runIf(hasShell())("passes shell self-test for SemVer, port and redaction", () => {
    const result = runShellCommand(`${shellQuote(toShellPath(techdeskScript))} --self-test`);

    expect(result.stderr).toBe("");
    expect(result.stdout).toContain("setup self-test: PASS");
    expect(result.status).toBe(0);
  });

  it.runIf(hasShell())(
    "runs read-only status without a writable log and diagnoses Docker socket denial",
    () => {
      const result = runShellCommand(
        [
          'runtime="$(mktemp -d)"',
          'trap \'chmod 600 "$runtime/.env" 2>/dev/null || true; rm -rf "$runtime"\' EXIT',
          'mkdir -p "$runtime/bin" "$runtime/backups" "$runtime/nginx"',
          'cp "$1" "$runtime/techdesk"',
          'cp "$2" "$runtime/setup-core.sh"',
          'cp "$3" "$runtime/docker-compose.yml"',
          'printf "1.1.0\\n" > "$runtime/VERSION"',
          'printf "TECHDESK_PORT=9999\\nTECHDESK_PROJECT_NAME=secret-project\\n" > "$runtime/.env"',
          'chmod 000 "$runtime/.env"',
          'printf \'%s\\n\' \'{"installationId":"public-id","version":"1.1.0","projectName":"techdesk-status-test","frontendPort":"18080","installerVersion":"1.1.0"}\' > "$runtime/techdesk-installation.json"',
          'chmod 644 "$runtime/techdesk-installation.json"',
          'printf "blocked\\n" > "$runtime/log-blocker"',
          'printf \'#!/bin/sh\\nexit 0\\n\' > "$runtime/bin/curl"',
          'printf \'#!/bin/sh\\nif [ "${1:-}" = "info" ]; then echo "permission denied while trying to connect to the Docker daemon socket" >&2; exit 1; fi\\nif [ "${1:-}" = "compose" ]; then echo "Docker Compose version test"; exit 0; fi\\nexit 1\\n\' > "$runtime/bin/docker"',
          'chmod 755 "$runtime/techdesk" "$runtime/setup-core.sh" "$runtime/bin/curl" "$runtime/bin/docker"',
          'PATH="$runtime/bin:$PATH" LOG_DIR="$runtime/log-blocker" TECHDESK_RUNTIME_ROOT="$runtime" "$runtime/techdesk" status',
        ].join("\n"),
        [techdeskScript, setupCoreScript, composeFile]
      );

      expect(result.stderr).toBe("");
      expect(result.status).toBe(0);
      expect(result.stdout).toContain("Version: 1.1.0");
      expect(result.stdout).toContain("Installation: INSTALLED_HEALTHY");
      expect(result.stdout).toContain("Docker: permission denied");
      expect(result.stdout).toContain("sem acesso ao Docker socket");
      expect(result.stdout).toContain("http://localhost:18080");
      expect(result.stdout).not.toContain("secret-project");
      expect(result.stdout).not.toContain("Permission denied");
    }
  );

  it.runIf(hasShell())(
    "shows container status without reading the protected env file",
    () => {
      const result = runShellCommand(
        [
          'runtime="$(mktemp -d)"',
          'trap \'chmod 600 "$runtime/.env" 2>/dev/null || true; rm -rf "$runtime"\' EXIT',
          'mkdir -p "$runtime/bin" "$runtime/logs" "$runtime/backups" "$runtime/nginx"',
          'cp "$1" "$runtime/techdesk"',
          'cp "$2" "$runtime/setup-core.sh"',
          'cp "$3" "$runtime/docker-compose.yml"',
          'printf "1.1.0\\n" > "$runtime/VERSION"',
          'printf "TECHDESK_PORT=9999\\n" > "$runtime/.env"',
          'chmod 000 "$runtime/.env"',
          'printf \'%s\\n\' \'{"installationId":"public-id","version":"1.1.0","projectName":"techdesk-status-test","frontendPort":"18080","installerVersion":"1.1.0"}\' > "$runtime/techdesk-installation.json"',
          'printf \'#!/bin/sh\\nexit 0\\n\' > "$runtime/bin/curl"',
          'printf \'#!/bin/sh\\ncase "$*" in *--env-file*) echo "FORBIDDEN_ENV_READ"; exit 99;; esac\\ncase "${1:-}" in info) exit 0;; compose) exit 0;; ps) echo "techdesk-api Up"; exit 0;; volume) echo "techdesk-status-test_pgdata"; exit 0;; esac\\nexit 1\\n\' > "$runtime/bin/docker"',
          'chmod 755 "$runtime/techdesk" "$runtime/setup-core.sh" "$runtime/bin/curl" "$runtime/bin/docker"',
          'PATH="$runtime/bin:$PATH" TECHDESK_RUNTIME_ROOT="$runtime" "$runtime/techdesk" status',
        ].join("\n"),
        [techdeskScript, setupCoreScript, composeFile]
      );

      expect(result.stderr).toBe("");
      expect(result.status).toBe(0);
      expect(result.stdout).toContain("Docker: running");
      expect(result.stdout).toContain("techdesk-api Up");
      expect(result.stdout).not.toContain("FORBIDDEN_ENV_READ");
    }
  );

  it.runIf(hasShell())(
    "never falls back to 1.0.0 when metadata and VERSION are unreadable",
    () => {
      const result = runShellCommand(
        [
          'runtime="$(mktemp -d)"',
          'trap \'chmod 600 "$runtime/.env" "$runtime/VERSION" 2>/dev/null || true; rm -rf "$runtime"\' EXIT',
          'mkdir -p "$runtime/bin" "$runtime/backups" "$runtime/nginx"',
          'cp "$1" "$runtime/techdesk"',
          'cp "$2" "$runtime/setup-core.sh"',
          'cp "$3" "$runtime/docker-compose.yml"',
          'printf "1.1.1\\n" > "$runtime/VERSION"',
          'printf "TECHDESK_PORT=9999\\nTECHDESK_VERSION=1.1.1\\nTECHDESK_API_IMAGE=ghcr.io/welissonhrq21/techdesk-pro-api:1.1.1\\n" > "$runtime/.env"',
          'chmod 000 "$runtime/.env" "$runtime/VERSION"',
          'printf \'#!/bin/sh\\nexit 1\\n\' > "$runtime/bin/curl"',
          'printf \'#!/bin/sh\\nif [ "${1:-}" = "info" ]; then echo "permission denied while trying to connect to the Docker daemon socket" >&2; exit 1; fi\\nif [ "${1:-}" = "compose" ]; then echo "Docker Compose version test"; exit 0; fi\\nexit 1\\n\' > "$runtime/bin/docker"',
          'chmod 755 "$runtime/techdesk" "$runtime/setup-core.sh" "$runtime/bin/curl" "$runtime/bin/docker"',
          'PATH="$runtime/bin:$PATH" TECHDESK_RUNTIME_ROOT="$runtime" "$runtime/techdesk" status',
        ].join("\n"),
        [techdeskScript, setupCoreScript, composeFile]
      );

      expect(result.stderr).toBe("");
      expect(result.status).toBe(1);
      expect(result.stdout).toContain("Version: UNKNOWN");
      expect(result.stdout).toContain(
        "WARNING: Unable to determine installed TechDesk version."
      );
      expect(result.stdout).not.toContain("Version: 1.0.0");
    }
  );

  it.runIf(hasShell())(
    "uses readable public VERSION when metadata is missing without reading protected env",
    () => {
      const result = runShellCommand(
        [
          'runtime="$(mktemp -d)"',
          'trap \'chmod 600 "$runtime/.env" 2>/dev/null || true; rm -rf "$runtime"\' EXIT',
          'mkdir -p "$runtime/bin" "$runtime/backups" "$runtime/nginx"',
          'cp "$1" "$runtime/techdesk"',
          'cp "$2" "$runtime/setup-core.sh"',
          'cp "$3" "$runtime/docker-compose.yml"',
          'printf "1.1.1\\n" > "$runtime/VERSION"',
          'printf "TECHDESK_PORT=9999\\nTECHDESK_VERSION=1.1.1\\n" > "$runtime/.env"',
          'chmod 000 "$runtime/.env"',
          'printf \'#!/bin/sh\\nexit 1\\n\' > "$runtime/bin/curl"',
          'printf \'#!/bin/sh\\nif [ "${1:-}" = "info" ]; then echo "permission denied while trying to connect to the Docker daemon socket" >&2; exit 1; fi\\nif [ "${1:-}" = "compose" ]; then echo "Docker Compose version test"; exit 0; fi\\nexit 1\\n\' > "$runtime/bin/docker"',
          'chmod 755 "$runtime/techdesk" "$runtime/setup-core.sh" "$runtime/bin/curl" "$runtime/bin/docker"',
          'PATH="$runtime/bin:$PATH" TECHDESK_RUNTIME_ROOT="$runtime" "$runtime/techdesk" status',
        ].join("\n"),
        [techdeskScript, setupCoreScript, composeFile]
      );

      expect(result.stderr).toBe("");
      expect(result.status).toBe(1);
      expect(result.stdout).toContain("Version: 1.1.1");
      expect(result.stdout).toContain(
        "WARNING: metadata ausente; usando VERSION publico como fallback read-only."
      );
      expect(result.stdout).toContain("Installation: PARTIAL_INSTALLATION");
      expect(result.stdout).not.toContain("Permission denied");
    }
  );

  it.runIf(hasShell())(
    "warns and fails status when metadata and VERSION disagree",
    () => {
      const result = runShellCommand(
        [
          'runtime="$(mktemp -d)"',
          'trap \'rm -rf "$runtime"\' EXIT',
          'mkdir -p "$runtime/bin" "$runtime/backups" "$runtime/nginx"',
          'cp "$1" "$runtime/techdesk"',
          'cp "$2" "$runtime/setup-core.sh"',
          'cp "$3" "$runtime/docker-compose.yml"',
          'printf "1.1.0\\n" > "$runtime/VERSION"',
          'printf "TECHDESK_PORT=9999\\n" > "$runtime/.env"',
          'printf \'%s\\n\' \'{"installationId":"public-id","version":"1.1.1","projectName":"techdesk-status-test","frontendPort":"18080","installerVersion":"1.1.1"}\' > "$runtime/techdesk-installation.json"',
          'printf \'#!/bin/sh\\nexit 0\\n\' > "$runtime/bin/curl"',
          'printf \'#!/bin/sh\\nif [ "${1:-}" = "info" ]; then exit 0; fi\\nif [ "${1:-}" = "compose" ]; then echo "Docker Compose version test"; exit 0; fi\\nif [ "${1:-}" = "ps" ]; then echo "techdesk-api Up"; exit 0; fi\\nif [ "${1:-}" = "volume" ]; then echo "techdesk-status-test_pgdata"; exit 0; fi\\nexit 1\\n\' > "$runtime/bin/docker"',
          'chmod 755 "$runtime/techdesk" "$runtime/setup-core.sh" "$runtime/bin/curl" "$runtime/bin/docker"',
          'PATH="$runtime/bin:$PATH" TECHDESK_RUNTIME_ROOT="$runtime" "$runtime/techdesk" status',
        ].join("\n"),
        [techdeskScript, setupCoreScript, composeFile]
      );

      expect(result.stderr).toBe("");
      expect(result.status).toBe(1);
      expect(result.stdout).toContain("Version: 1.1.1");
      expect(result.stdout).toContain(
        "WARNING: metadata version (1.1.1) differs from VERSION file (1.1.0)."
      );
    }
  );

  it.runIf(hasShell())(
    "finishes install only after metadata is persisted with public-readable modes",
    () => {
      const result = runShellCommand(
        [
          'runtime="$(mktemp -d)"',
          'trap \'chmod 600 "$runtime/.env" 2>/dev/null || true; rm -rf "$runtime"\' EXIT',
          'mkdir -p "$runtime/bin" "$runtime/logs" "$runtime/backups" "$runtime/nginx"',
          'cp "$1" "$runtime/techdesk"',
          'cp "$2" "$runtime/setup-core.sh"',
          'cp "$3" "$runtime/docker-compose.yml"',
          'cp "$4" "$runtime/seed-admin.js"',
          'cp "$5" "$runtime/nginx/default.conf"',
          'printf "1.1.1\\n" > "$runtime/VERSION"',
          'printf \'#!/bin/sh\\nexit 0\\n\' > "$runtime/bin/curl"',
          'printf \'#!/bin/sh\\ncase "${1:-}" in info) exit 0;; compose) shift; case "$*" in *version*) echo "Docker Compose version test"; exit 0;; *config*|*pull*|*"up -d postgres"*|*"up -d api"*|*"up -d frontend"*|*"exec -T api node /app/deploy/seed-admin.js"*) exit 0;; *ps*|*logs*) exit 0;; esac;; ps|volume) exit 0;; esac\\nexit 1\\n\' > "$runtime/bin/docker"',
          'printf \'#!/bin/sh\\nprintf "%s\\\\n" "Filesystem 1024-blocks Used Available Capacity Mounted on" "/dev/test 10000000 1 9999999 1%% /"\\n\' > "$runtime/bin/df"',
          'printf \'#!/bin/sh\\nexit 1\\n\' > "$runtime/bin/ss"',
          'printf \'#!/bin/sh\\nexit 1\\n\' > "$runtime/bin/lsof"',
          'chmod 755 "$runtime/techdesk" "$runtime/setup-core.sh" "$runtime/bin/curl" "$runtime/bin/docker" "$runtime/bin/df" "$runtime/bin/ss" "$runtime/bin/lsof"',
          'PATH="$runtime/bin:$PATH" TECHDESK_RUNTIME_ROOT="$runtime" "$runtime/techdesk" install --port 18080 --non-interactive --admin-password test-password',
          'printf "\\nmetadata=%s\\nversion_mode=%s\\nenv_mode=%s\\nmetadata_mode=%s\\n" "$(sed -n \'s/.*\\"version\\": \\"\\([^\\"]*\\)\\".*/\\1/p\' "$runtime/techdesk-installation.json")" "$(stat -c %a "$runtime/VERSION")" "$(stat -c %a "$runtime/.env")" "$(stat -c %a "$runtime/techdesk-installation.json")"',
        ].join("\n"),
        [
          techdeskScript,
          setupCoreScript,
          composeFile,
          join(deployDir, "seed-admin.js"),
          join(deployDir, "nginx", "default.conf"),
        ]
      );

      expect(result.stderr).toBe("");
      expect(result.status).toBe(0);
      expect(result.stdout).toContain("[8/8] Finalizando...");
      expect(result.stdout).toContain("TechDesk Pro instalado com sucesso.");
      expect(result.stdout).toContain("metadata=1.1.1");
      expect(result.stdout).toContain("version_mode=644");
      expect(result.stdout).toContain("env_mode=600");
      expect(result.stdout).toContain("metadata_mode=644");
    }
  );

  it.runIf(hasShell())(
    "fails mutable commands before logging when runtime access requires sudo",
    () => {
      const result = runShellCommand(
        [
          'runtime="$(mktemp -d)"',
          'trap \'rm -rf "$runtime"\' EXIT',
          'mkdir -p "$runtime/backups" "$runtime/nginx"',
          'cp "$1" "$runtime/techdesk"',
          'cp "$2" "$runtime/setup-core.sh"',
          'cp "$3" "$runtime/docker-compose.yml"',
          'printf "1.1.0\\n" > "$runtime/VERSION"',
          'printf "TECHDESK_PORT=18080\\n" > "$runtime/.env"',
          'printf "blocked\\n" > "$runtime/log-blocker"',
          'chmod 755 "$runtime/techdesk" "$runtime/setup-core.sh"',
          'run_denied() { if output="$(LOG_DIR="$runtime/log-blocker" TECHDESK_RUNTIME_ROOT="$runtime" "$runtime/techdesk" "$@" 2>&1)"; then code=0; else code=$?; fi; printf "%s-code=%s\\n%s\\n" "$1" "$code" "$output"; }',
          'run_denied install --non-interactive --admin-password test-password',
          'run_denied repair',
          'run_denied upgrade --version 1.1.1',
        ].join("\n"),
        [techdeskScript, setupCoreScript, composeFile]
      );

      expect(result.stderr).toBe("");
      expect(result.status).toBe(0);
      expect(result.stdout).toContain("install-code=1");
      expect(result.stdout).toContain("repair-code=1");
      expect(result.stdout).toContain("upgrade-code=1");
      expect(result.stdout.match(/requer privilegios administrativos/g)).toHaveLength(3);
      expect(result.stdout).not.toContain("Permission denied");
    }
  );

  it.runIf(hasShell())(
    "keeps env, logs and backups private while public metadata and VERSION remain readable",
    () => {
      const result = runShellCommand(
        [
          'runtime="$(mktemp -d)"',
          'trap \'rm -rf "$runtime"\' EXIT',
          'mkdir -p "$runtime/logs" "$runtime/backups"',
          'printf "JWT_SECRET=test-only\\nPOSTGRES_PASSWORD=test-only\\n" > "$runtime/.env"',
          'printf \'%s\\n\' \'{"installationId":"public-id","version":"1.1.0","projectName":"techdesk-test","frontendPort":"18080"}\' > "$runtime/techdesk-installation.json"',
          'printf "1.1.1\\n" > "$runtime/VERSION"',
          'chmod 666 "$runtime/.env" "$runtime/techdesk-installation.json" "$runtime/VERSION"',
          'DEPLOY_ROOT="$runtime"',
          'ENV_FILE="$runtime/.env"',
          'METADATA_FILE="$runtime/techdesk-installation.json"',
          'LOG_DIR="$runtime/logs"',
          'BACKUP_DIR="$runtime/backups"',
          '. "$1"',
          'ensure_env_permissions',
          'setup_log_init',
          'printf "env=%s\\nmetadata=%s\\nversion=%s\\nlogs=%s\\nbackups=%s\\nlog=%s\\n" "$(stat -c %a "$runtime/.env")" "$(stat -c %a "$runtime/techdesk-installation.json")" "$(stat -c %a "$runtime/VERSION")" "$(stat -c %a "$runtime/logs")" "$(stat -c %a "$runtime/backups")" "$(stat -c %a "$SETUP_LOG_FILE")"',
        ].join("\n"),
        [setupCoreScript]
      );

      expect(result.stderr).toBe("");
      expect(result.status).toBe(0);
      expect(result.stdout).toContain("env=600");
      expect(result.stdout).toContain("metadata=644");
      expect(result.stdout).toContain("version=644");
      expect(result.stdout).toContain("logs=700");
      expect(result.stdout).toContain("backups=700");
      expect(result.stdout).toContain("log=600");
    }
  );

  it.runIf(hasShell())(
    "syncs a persistent Linux runtime that survives installer source deletion",
    () => {
      const installerSource = createFakeInstallerSource();
      const runtimeRoot = mkdtempSync(join(tmpdir(), "techdesk-runtime-"));

      const syncResult = runShellCommand(
        '. "$1"; sync_runtime_from_source',
        [join(installerSource, "setup-core.sh")],
        {
          DEPLOY_ROOT: toShellPath(installerSource),
          TECHDESK_RUNTIME_ROOT: toShellPath(runtimeRoot),
        },
        tmpdir()
      );

      expect(syncResult.stderr).toBe("");
      expect(syncResult.status).toBe(0);

      rmSync(installerSource, { recursive: true, force: true });
      expect(existsSync(installerSource)).toBe(false);

      for (const file of linuxRuntimeFiles) {
        expect(existsSync(join(runtimeRoot, file))).toBe(true);
      }

      const runtimeInspection = runShellCommand(
        [
          'DEPLOY_ROOT="$1"',
          'TECHDESK_RUNTIME_ROOT="$1"',
          '. "$1/setup-core.sh"',
          'printf "env=%s\\nmetadata=%s\\nlogs=%s\\nbackups=%s\\n" "$ENV_FILE" "$METADATA_FILE" "$LOG_DIR" "$BACKUP_DIR"',
        ].join("; "),
        [runtimeRoot],
        {},
        root
      );

      expect(runtimeInspection.status).toBe(0);
      const expectedRuntimeRoot = toShellPath(runtimeRoot);
      expect(runtimeInspection.stdout).toContain(`env=${expectedRuntimeRoot}/.env`);
      expect(runtimeInspection.stdout).toContain(
        `metadata=${expectedRuntimeRoot}/techdesk-installation.json`
      );
      expect(runtimeInspection.stdout).toContain(`logs=${expectedRuntimeRoot}/logs`);
      expect(runtimeInspection.stdout).toContain(
        `backups=${expectedRuntimeRoot}/backups`
      );
      expect(runtimeInspection.stdout).not.toContain(toShellPath(installerSource));

    }
  );

  it.runIf(hasShell())(
    "repairs missing metadata only when legacy version sources agree",
    () => {
      const result = runShellCommand(
        [
          'runtime="$(mktemp -d)"',
          'trap \'chmod 600 "$runtime/.env" 2>/dev/null || true; rm -rf "$runtime"\' EXIT',
          'mkdir -p "$runtime/bin" "$runtime/logs" "$runtime/backups" "$runtime/nginx"',
          'cp "$1" "$runtime/techdesk"',
          'cp "$2" "$runtime/setup-core.sh"',
          'cp "$3" "$runtime/docker-compose.yml"',
          'cp "$4" "$runtime/seed-admin.js"',
          'printf "1.1.0\\n" > "$runtime/VERSION"',
          'printf "TECHDESK_PORT=18080\\nTECHDESK_PROJECT_NAME=techdesk-status-test\\nTECHDESK_VERSION=1.1.0\\nTECHDESK_API_IMAGE=ghcr.io/welissonhrq21/techdesk-pro-api:1.1.0\\nTECHDESK_FRONTEND_IMAGE=ghcr.io/welissonhrq21/techdesk-pro-frontend:1.1.0\\n" > "$runtime/.env"',
          'printf \'#!/bin/sh\\nexit 0\\n\' > "$runtime/bin/curl"',
          'printf \'#!/bin/sh\\ncase "${1:-}" in info) exit 0;; compose) shift; case "$*" in *version*) echo "Docker Compose version test"; exit 0;; *config*|*pull*|*"up -d"*|*"exec -T api node /app/deploy/seed-admin.js"*) exit 0;; *ps*|*logs*) exit 0;; esac;; ps|volume) exit 0;; esac\\nexit 1\\n\' > "$runtime/bin/docker"',
          'printf \'#!/bin/sh\\nprintf "%s\\\\n" "Filesystem 1024-blocks Used Available Capacity Mounted on" "/dev/test 10000000 1 9999999 1%% /"\\n\' > "$runtime/bin/df"',
          'printf \'#!/bin/sh\\nexit 1\\n\' > "$runtime/bin/ss"',
          'printf \'#!/bin/sh\\nexit 1\\n\' > "$runtime/bin/lsof"',
          'chmod 755 "$runtime/techdesk" "$runtime/setup-core.sh" "$runtime/bin/curl" "$runtime/bin/docker" "$runtime/bin/df" "$runtime/bin/ss" "$runtime/bin/lsof"',
          'PATH="$runtime/bin:$PATH" TECHDESK_RUNTIME_ROOT="$runtime" "$runtime/techdesk" repair',
          'printf "\\nmetadata=%s\\nmetadata_mode=%s\\n" "$(sed -n \'s/.*\\"version\\": \\"\\([^\\"]*\\)\\".*/\\1/p\' "$runtime/techdesk-installation.json")" "$(stat -c %a "$runtime/techdesk-installation.json")"',
        ].join("\n"),
        [techdeskScript, setupCoreScript, composeFile, join(deployDir, "seed-admin.js")]
      );

      expect(result.stderr).toBe("");
      expect(result.status).toBe(0);
      expect(result.stdout).toContain(
        "Metadata ausente; validando fontes de versao antes de reconstruir."
      );
      expect(result.stdout).toContain("metadata=1.1.0");
      expect(result.stdout).toContain("metadata_mode=644");
    }
  );

  it.runIf(hasShell())(
    "blocks metadata repair when legacy version sources diverge",
    () => {
      const result = runShellCommand(
        [
          'runtime="$(mktemp -d)"',
          'trap \'rm -rf "$runtime"\' EXIT',
          'mkdir -p "$runtime/bin" "$runtime/logs" "$runtime/backups" "$runtime/nginx"',
          'cp "$1" "$runtime/techdesk"',
          'cp "$2" "$runtime/setup-core.sh"',
          'cp "$3" "$runtime/docker-compose.yml"',
          'cp "$4" "$runtime/seed-admin.js"',
          'printf "1.1.0\\n" > "$runtime/VERSION"',
          'printf "TECHDESK_PORT=18080\\nTECHDESK_PROJECT_NAME=techdesk-status-test\\nTECHDESK_VERSION=1.1.0\\nTECHDESK_API_IMAGE=ghcr.io/welissonhrq21/techdesk-pro-api:1.0.0\\nTECHDESK_FRONTEND_IMAGE=ghcr.io/welissonhrq21/techdesk-pro-frontend:1.1.0\\n" > "$runtime/.env"',
          'printf \'#!/bin/sh\\nexit 0\\n\' > "$runtime/bin/curl"',
          'printf \'#!/bin/sh\\ncase "${1:-}" in info) exit 0;; compose) shift; case "$*" in *version*) echo "Docker Compose version test"; exit 0;; *config*|*pull*|*"up -d"*|*"exec -T api node /app/deploy/seed-admin.js"*) exit 0;; *ps*|*logs*) exit 0;; esac;; ps|volume) exit 0;; esac\\nexit 1\\n\' > "$runtime/bin/docker"',
          'printf \'#!/bin/sh\\nprintf "%s\\\\n" "Filesystem 1024-blocks Used Available Capacity Mounted on" "/dev/test 10000000 1 9999999 1%% /"\\n\' > "$runtime/bin/df"',
          'printf \'#!/bin/sh\\nexit 1\\n\' > "$runtime/bin/ss"',
          'printf \'#!/bin/sh\\nexit 1\\n\' > "$runtime/bin/lsof"',
          'chmod 755 "$runtime/techdesk" "$runtime/setup-core.sh" "$runtime/bin/curl" "$runtime/bin/docker" "$runtime/bin/df" "$runtime/bin/ss" "$runtime/bin/lsof"',
          'PATH="$runtime/bin:$PATH" TECHDESK_RUNTIME_ROOT="$runtime" "$runtime/techdesk" repair',
        ].join("\n"),
        [techdeskScript, setupCoreScript, composeFile, join(deployDir, "seed-admin.js")]
      );

      expect(result.status).toBe(90);
      expect(result.stderr).toContain("Versoes divergentes detectadas");
      expect(result.stdout).not.toContain("Repair concluido");
    }
  );

  it.runIf(hasShell())("blocks upgrade when current version is UNKNOWN", () => {
    const result = runShellCommand(
      [
        'runtime="$(mktemp -d)"',
        'trap \'chmod 600 "$runtime/VERSION" "$runtime/techdesk-installation.json" 2>/dev/null || true; rm -rf "$runtime"\' EXIT',
        'mkdir -p "$runtime/bin" "$runtime/logs" "$runtime/backups" "$runtime/nginx"',
        'cp "$1" "$runtime/techdesk"',
        'cp "$2" "$runtime/setup-core.sh"',
        'cp "$3" "$runtime/docker-compose.yml"',
        'printf "1.1.0\\n" > "$runtime/VERSION"',
        'printf "TECHDESK_PORT=18080\\nTECHDESK_PROJECT_NAME=techdesk-status-test\\n" > "$runtime/.env"',
        'printf \'%s\\n\' \'{"installationId":"public-id","version":"1.1.0","projectName":"techdesk-status-test","frontendPort":"18080","installerVersion":"1.1.0"}\' > "$runtime/techdesk-installation.json"',
        'chmod 000 "$runtime/VERSION" "$runtime/techdesk-installation.json"',
        'printf \'#!/bin/sh\\nexit 0\\n\' > "$runtime/bin/curl"',
        'printf \'#!/bin/sh\\nif [ "${1:-}" = "info" ]; then exit 0; fi\\nif [ "${1:-}" = "compose" ]; then echo "Docker Compose version test"; exit 0; fi\\nif [ "${1:-}" = "ps" ]; then echo "techdesk-api Up"; exit 0; fi\\nif [ "${1:-}" = "volume" ]; then echo "techdesk-status-test_pgdata"; exit 0; fi\\nexit 1\\n\' > "$runtime/bin/docker"',
        'chmod 755 "$runtime/techdesk" "$runtime/setup-core.sh" "$runtime/bin/curl" "$runtime/bin/docker"',
        'PATH="$runtime/bin:$PATH" TECHDESK_RUNTIME_ROOT="$runtime" "$runtime/techdesk" upgrade --version 1.1.1',
      ].join("\n"),
      [techdeskScript, setupCoreScript, composeFile]
    );

    expect(result.status).toBe(2);
    expect(result.stdout).toContain(
      "Unable to determine installed TechDesk version. Upgrade bloqueado."
    );
  });

  it.runIf(hasShell())("packages Linux runtime public files with stable modes", () => {
    const result = runShellCommand(
      [
        'archive="$(PACKAGE_SUFFIX=rc.1 "$1")"',
        'tar -tvzf "$archive" | awk \'/deploy\\/techdesk$/ || /deploy\\/VERSION$/ || /deploy\\/README-INSTALL.md$/ || /deploy\\/nginx\\/default.conf$/ {print $1, $NF}\'',
        'printf "VERSION_CONTENT="',
        'tar -xOzf "$archive" techdesk-pro-setup-1.1.1-rc.1/deploy/VERSION',
      ].join("\n"),
      [packageScript]
    );

    expect(result.stderr).toBe("");
    expect(result.status).toBe(0);
    expect(result.stdout).toContain("-rwxr-xr-x techdesk-pro-setup-1.1.1-rc.1/deploy/techdesk");
    expect(result.stdout).toContain("-rw-r--r-- techdesk-pro-setup-1.1.1-rc.1/deploy/VERSION");
    expect(result.stdout).toContain(
      "-rw-r--r-- techdesk-pro-setup-1.1.1-rc.1/deploy/README-INSTALL.md"
    );
    expect(result.stdout).toContain(
      "-rw-r--r-- techdesk-pro-setup-1.1.1-rc.1/deploy/nginx/default.conf"
    );
    expect(result.stdout).toContain("VERSION_CONTENT=1.1.1-rc.1");
  });

  it.runIf(hasShell())(
    "separates invalid, same, downgrade and upgrade SemVer classifications",
    () => {
      const result = runShellCommand(
        [
          '. "$1"',
          'semver_upgrade_classification invalid 1.0.0',
          'printf "\\n"',
          'semver_upgrade_classification 1 1.0.0',
          'printf "\\n"',
          'semver_upgrade_classification 1.0 1.0.0',
          'printf "\\n"',
          'semver_upgrade_classification abc 1.0.0',
          'printf "\\n"',
          'semver_upgrade_classification 1.0.0 1.0.0',
          'printf "\\n"',
          'semver_upgrade_classification 1.1.0 1.0.0',
          'printf "\\n"',
          'semver_upgrade_classification 1.1.1-rc.1 1.1.0',
          'printf "\\n"',
          'semver_upgrade_classification 1.10.0 1.0.0',
          'printf "\\n"',
          'semver_upgrade_classification 0.9.0 1.0.0',
        ].join("; "),
        [setupCoreScript]
      );

      expect(result.stderr).toBe("");
      expect(result.status).toBe(0);
      expect(result.stdout.trim().split(/\r?\n/)).toEqual([
        "INVALID_VERSION",
        "INVALID_VERSION",
        "INVALID_VERSION",
        "INVALID_VERSION",
        "SAME_VERSION",
        "UPGRADE",
        "UPGRADE",
        "UPGRADE",
        "DOWNGRADE",
      ]);
    }
  );

  it.runIf(hasShell() && hasDockerCompose())(
    "validates compose config without logging expanded secrets",
    () => {
      const fakeRoot = createFakeDeployRoot();
      const logDir = join(fakeRoot, "logs");
      const fakeEnvFile = join(fakeRoot, ".env");
      const fakeComposeFile = join(fakeRoot, "docker-compose.yml");
      const adminPassword = "TEST_ADMIN_PASSWORD_STAGE501";
      const jwtSecret = "TEST_JWT_SECRET_STAGE501_ABCDEFGHIJKLMNOPQRSTUVWXYZ";
      const postgresPassword = "TEST_POSTGRES_PASSWORD_STAGE501";

      const envContent = [
        "TECHDESK_PORT=18080",
        "TECHDESK_PROJECT_NAME=techdesk-stage501-test",
        "TECHDESK_VERSION=1.1.0",
        "POSTGRES_DB=techdesk",
        "POSTGRES_USER=techdesk",
        `POSTGRES_PASSWORD=${postgresPassword}`,
        `DATABASE_URL=postgresql://techdesk:${postgresPassword}@postgres:5432/techdesk?schema=public`,
        `JWT_SECRET=${jwtSecret}`,
        "JWT_EXPIRES_IN=8h",
        "CORS_ORIGIN=http://localhost:18080",
        "SWAGGER_ENABLED=false",
        "LOG_LEVEL=info",
        "ADMIN_NAME=Administrador",
        "ADMIN_LOGIN=admin",
        `ADMIN_PASSWORD=${adminPassword}`,
        "TECHDESK_API_IMAGE=ghcr.io/welissonhrq21/techdesk-pro-api:1.1.0",
        "TECHDESK_FRONTEND_IMAGE=ghcr.io/welissonhrq21/techdesk-pro-frontend:1.1.0",
      ].join("\n");

      writeFileSync(fakeEnvFile, envContent);

      const result = runShellCommand(
        '. "$1"; setup_log_init; validate_compose_config; printf "%s" "$SETUP_LOG_FILE"',
        [setupCoreScript],
        {
          DEPLOY_ROOT: toShellPath(fakeRoot),
          ENV_FILE: toShellPath(fakeEnvFile),
          COMPOSE_FILE: toShellPath(fakeComposeFile),
          LOG_DIR: toShellPath(logDir),
        }
      );

      expect(result.stderr).toBe("");
      expect(result.stdout).toContain("Compose configuration: OK");
      expect(result.status).toBe(0);

      const logPath = fromShellPath(result.stdout.trim().split(/\r?\n/).at(-1) ?? "");
      const log = readFileSync(logPath, "utf8");

      expect(log).toContain("Compose configuration: OK");
      expect(log).not.toContain(adminPassword);
      expect(log).not.toContain(jwtSecret);
      expect(log).not.toContain(postgresPassword);
      expect(log).not.toContain("DATABASE_URL: postgresql://");
      expect(log).not.toContain("ADMIN_PASSWORD:");
      expect(log).not.toContain("JWT_SECRET:");
      expect(log).not.toContain("POSTGRES_PASSWORD:");
    }
  );
});
