# Release v1.1.0 - TechDesk Pro

Status: Release Candidate prepared.

## Highlights

- Auditable stock reversal for service-order part consumption.
- Optional customer CPF/CNPJ with support for valid alphanumeric CNPJ.
- First-run web onboarding with company setup and initial team users.
- Frontend route code splitting and production bundle reduction.
- Installer/setup package updated for v1.1.0 RC.
- Production frontend uses same-origin `/api` through Nginx proxy.
- Backup/restore-check flow validated on clean install and v1.0.0 upgrade data.

## Compatibility

Validated upgrade path:

- source: v1.0.0 images and populated database;
- target: v1.1.0 RC images;
- migrations applied: 12 -> 15;
- existing operational data preserved;
- existing installations are marked `setupCompleted=true` during upgrade, preventing onboarding from reopening in production.

## RC Artifact

- File: `dist/techdesk-pro-setup-1.1.0-rc.tar.gz`
- SHA256: `BD723DAA2DDF1EE52308052276EDEEF87B77DC4D3D4E50817971E0AF8E337CCB`

## Validation Summary

- Backend typecheck, tests, build and audit: pass.
- Frontend lint, tests, build and audit: pass.
- Docker API image build: pass.
- Docker frontend image build: pass.
- Clean install: pass.
- Upgrade v1.0.0 -> v1.1.0: pass.
- Backup and restore-check: pass.
- Restart persistence: pass.
- CORS restricted without `*`: pass.
- Swagger disabled in production flag: pass.
- Log secret scan: pass.

## Known Operational Note

The Linux installer path should receive one final smoke test on the real target Linux host. In the local Windows/WSL validation, Docker Desktop was accessible from PowerShell but not from the WSL shell used by the Linux installer command.

## Release Guardrails

- Do not move or recreate `v1.0.0`.
- Do not publish `latest` before final approval.
- Do not create final tag `v1.1.0` until RC is explicitly approved.
- Use versioned images for production deployment.
