# Post-v1.2.0 line endings baseline repair

## Root cause

The repository already enforced LF for `*.sh`, but the extensionless POSIX
dispatcher `deploy/techdesk` was not covered. On Windows installations with
`core.autocrlf=true`, Git materialized that file with CRLF. WSL then interpreted
its shebang as `#!/bin/sh\r`, causing exit code 127 before the script could run.

## Repository policy

`.gitattributes` now explicitly enforces LF for `deploy/techdesk` in addition to
the existing `*.sh` policy. PowerShell scripts are explicitly assigned CRLF.
The policy is repository-owned and does not depend on changing a developer's
global Git configuration.

The setup regression suite reads every `deploy/*.sh` file and `deploy/techdesk`
as bytes. It verifies an exact `#!/bin/sh` shebang and rejects carriage returns,
so the regression is detected on Windows as well as Linux.

## Verification

Verification includes a temporary checkout with `core.autocrlf=true`, real WSL
syntax and execution checks, setup/package determinism tests, and the complete
backend and frontend regression suites.

The released `v1.2.0` tag, release artifacts, and container images remain
unchanged. This repair is a separate post-release repository commit.
