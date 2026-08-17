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

function fromShellPath(path: string) {
  return path.replace(/^\/mnt\/([a-z])\//, (_match, drive: string) => {
    return `${drive.toUpperCase()}:\\`;
  }).replace(/\//g, "\\");
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
  it("keeps production compose on versioned images and private PostgreSQL", () => {
    const compose = readFileSync(composeFile, "utf8");

    expect(compose).toContain("ghcr.io/welissonhrq21/techdesk-pro-api:1.0.0");
    expect(compose).toContain(
      "ghcr.io/welissonhrq21/techdesk-pro-frontend:1.0.0"
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
        "TECHDESK_VERSION=1.0.0",
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
        "TECHDESK_API_IMAGE=ghcr.io/welissonhrq21/techdesk-pro-api:1.0.0",
        "TECHDESK_FRONTEND_IMAGE=ghcr.io/welissonhrq21/techdesk-pro-frontend:1.0.0",
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
