import { spawnSync } from "node:child_process";
import {
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const root = process.cwd();
const deployDir = join(root, "deploy");
const techdeskScript = join(deployDir, "techdesk");
const setupCoreScript = join(deployDir, "setup-core.sh");
const composeFile = join(deployDir, "docker-compose.yml");

function hasShell() {
  const result = spawnSync("sh", ["-c", "exit 0"], {
    stdio: "ignore",
  });

  return result.status === 0;
}

function hasDockerCompose() {
  const result = spawnSync("docker", ["compose", "version"], {
    stdio: "ignore",
  });

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
    const result = spawnSync("sh", [techdeskScript, "--self-test"], {
      cwd: root,
      encoding: "utf8",
    });

    expect(result.stderr).toBe("");
    expect(result.stdout).toContain("setup self-test: PASS");
    expect(result.status).toBe(0);
  });

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

      const result = spawnSync(
        "sh",
        [
          "-c",
          '. "$1"; setup_log_init; validate_compose_config; printf "%s" "$SETUP_LOG_FILE"',
          "techdesk-setup-test",
          setupCoreScript,
        ],
        {
          cwd: root,
          encoding: "utf8",
          env: {
            ...process.env,
            DEPLOY_ROOT: fakeRoot,
            ENV_FILE: fakeEnvFile,
            COMPOSE_FILE: fakeComposeFile,
            LOG_DIR: logDir,
          },
        }
      );

      expect(result.stderr).toBe("");
      expect(result.stdout).toContain("Compose configuration: OK");
      expect(result.status).toBe(0);

      const logPath = result.stdout.trim().split(/\r?\n/).at(-1) ?? "";
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
