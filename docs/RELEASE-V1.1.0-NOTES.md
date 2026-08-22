# TechDesk Pro v1.1.0

TechDesk Pro v1.1.0 is the first production update after v1.0.0. It expands
stock traceability, customer identification, first-run setup and the Linux
installation experience while preserving the validated v1.0.0 upgrade path.

## Highlights

- Auditable reversal of service-order part consumption.
- Net consumption after reversal, preserving approved budget limits.
- Optional customer CPF/CNPJ with normalized uniqueness and role-aware display.
- Numeric and alphanumeric CNPJ support.
- First-run web onboarding for company, administrator and initial team setup.
- New Linux bootstrapper and setup experience.
- Persistent operational runtime in `/opt/techdesk-pro`.
- Read-only `techdesk status` without `sudo` or privileged logging.
- Clear privilege checks before install, repair, upgrade and protected backups.
- Backup and restore-check improvements with secret-safe operational logs.
- Frontend route code splitting and smaller initial application loading.
- Production same-origin `/api` proxy through Nginx.

## Installation

The supported production target is Ubuntu Server LTS with Docker Engine and the
Docker Compose Plugin. Use the attached installer and checksum:

- `techdesk-pro-setup-1.1.0.tar.gz`
- `techdesk-pro-setup-1.1.0.tar.gz.sha256`

After extracting the package:

```sh
cd deploy
chmod +x *.sh techdesk
./techdesk install
```

The installer uses the versioned API and frontend images published for v1.1.0.
PostgreSQL is private to the Docker network and is not exposed on the host.

## Upgrade From v1.0.0

Back up the existing installation and validate the backup before upgrading.
Keep an external copy of the dump and the current `.env` in protected storage.

From the extracted v1.1.0 package, run:

```sh
sudo ./techdesk upgrade --version 1.1.0
```

The upgrade performs another mandatory pre-upgrade backup before changing image
references. Automatic downgrade is intentionally unsupported.

The v1.0.0 -> v1.1.0 path was validated with a populated database. All 15
migrations applied, operational data and secrets were preserved, and existing
installations did not reopen first-run onboarding.

## Validation

- Clean installation on Ubuntu: pass.
- Upgrade from v1.0.0 with existing data: pass.
- Health and ready checks: pass.
- Backup and restore-check: pass.
- Real reboot and container autostart: pass.
- Data, PostgreSQL volume, JWT secret and PostgreSQL password persistence: pass.
- Non-root status from different working directories: pass.
- PostgreSQL host exposure check: pass, not exposed.
- Backend and frontend automated regression: pass.
- Setup security and non-root harnesses: pass.
- Logs and distribution artifact secret scan: pass.

No known P0, P1, P2 or P3 issue remains from the final release smoke.

## Docker Images

- `ghcr.io/welissonhrq21/techdesk-pro-api:1.1.0`
- `ghcr.io/welissonhrq21/techdesk-pro-frontend:1.1.0`

The release uses explicit version tags. It does not require or publish `latest`.

## Security Notes

- `.env` remains private and is never included in the installer archive.
- Installation metadata is readable for status but contains no secrets.
- Setup logs redact passwords, tokens and credential-bearing URLs.
- Backups, logs and runtime secrets retain restrictive permissions.

See `deploy/README-INSTALL.md` and `deploy/README-BACKUP-RESTORE.md` for the full
operational procedures.
