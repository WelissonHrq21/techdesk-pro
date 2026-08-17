import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
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
});
