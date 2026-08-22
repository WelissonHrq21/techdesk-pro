# TechDesk Pro Release Pipeline

## Principle

The release pipeline follows one rule:

```text
BUILD ONCE -> TEST -> APPROVE DIGEST -> PROMOTE EXACT DIGEST -> RELEASE
```

A final Git tag never builds or republishes a container image. API and frontend
images are built as release candidates and final GHCR tags are aliases for the
already validated OCI manifests.

## Workflows

### Build Release Candidate Images

File: `.github/workflows/release-images.yml`

Trigger: manual `workflow_dispatch` only.

Required inputs:

- `candidate_version`: SemVer RC such as `1.2.0-rc.1`;
- `source_commit`: full 40-character SHA already integrated into `main`.

The workflow confirms that the commit is on `main` and has a successful `CI`
run. It builds API and frontend once and publishes two candidate identities in
each repository:

```text
sha-<full-commit>
<version>-rc.<number>
```

Existing candidate tags are refused. A failed partial candidate build must use a
new RC number after investigation; existing candidate tags are not overwritten.

Every candidate contains these OCI labels:

- `org.opencontainers.image.revision`;
- `org.opencontainers.image.version`;
- `org.opencontainers.image.source`;
- `org.opencontainers.image.created`.

The run summary and `release-images.json` artifact record both image names,
digests, candidate version and source commit. Candidate builds do not create
final version tags.

### Promote Approved Release Images

File: `.github/workflows/promote-release-images.yml`

Trigger: manual `workflow_dispatch` only.

Required inputs:

- `version`: final SemVer without `v`, such as `1.2.0`;
- `release_commit`: full approved commit SHA;
- `api_digest`: exact `sha256:...` from the approved candidate;
- `frontend_digest`: exact `sha256:...` from the approved candidate;
- `dry_run`: validation-only mode, enabled by default.

The workflow validates both source manifests before writing any target tag:

1. commit exists, is integrated into `main` and has green CI;
2. digest format is exact and is not resolved from `latest` or another tag;
3. each digest exists in the expected GHCR repository;
4. each OCI index contains `linux/amd64`;
5. source and revision OCI labels match the repository and release commit;
6. all four final target tags are inspected before the first registry write.

Promotion uses only `docker buildx imagetools create`. It does not run Docker,
Node or frontend builds.

## Final Tag Immutability

Final image tags are:

```text
<version>
v<version>
```

The promotion gate applies this policy to API and frontend:

- missing target: promotion is allowed;
- target already points to the approved digest: idempotent success;
- target points to another digest: hard failure with no overwrite.

GHCR package permissions remain a second access boundary. The project does not
rely on a registry-side immutable-tag setting; overwrite protection is explicit
and tested in the promotion workflow. Do not publish final tags outside this
workflow.

`latest`, major tags (`1`) and minor tags (`1.2`) are not managed automatically.

## Official Release Order

1. Freeze features and choose the release commit.
2. Push the commit to `main` and wait for green CI.
3. Run `Build Release Candidate Images` with a new RC number.
4. Record `release-images.json` and validate clean install and upgrade by digest.
5. Approve the exact API and frontend digests.
6. Generate the final installer metadata for the same version.
7. Run promotion first with `dry_run=true`.
8. Run promotion with `dry_run=false` using the same inputs.
9. Pull final tags and compare their RepoDigests with the approved digests.
10. Create the annotated Git tag from the same release commit.
11. Create the GitHub Release and upload the installer/checksum.
12. Run the post-publication integrity check.

The Git tag is deliberately created after image promotion. CI still validates
branch pushes, but no workflow runs from a tag push or publishes release images
from a branch push, so the tag cannot replace the approved manifests.

## Concurrency And Approval

Promotion uses a concurrency group scoped to the final version and does not
cancel an in-progress run. This prevents two runs for the same version from
writing concurrently.

A protected GitHub Environment named `release` is recommended when a second
maintainer is available. Configure required reviewers and prevent self-review,
then add `environment: release` to the promotion job. It is optional for now and
does not replace digest, revision or overwrite gates.

## Failure And Recovery

Both images and all four target tags pass preflight before promotion starts. If
an unexpected registry failure occurs after one image is promoted, stop the
release and investigate. Do not delete or rewrite tags automatically.

If a wrong digest reaches a final tag, block publication and treat the event as
an integrity incident. The normal recovery is a new patch version. Exceptional
manual recovery requires explicit incident approval and a recorded audit trail;
silent overwrite is never acceptable.

## Installer Pinning

The installer can continue using `:<version>` because final tags are promoted
from approved digests and protected from overwrite by the workflow.

Pinning `image: repository@sha256:...` would provide stronger end-to-end
immutability and GHCR supports pulls by digest. Adopt it in a future installer
revision after the packaging process can inject and display both approved OCI
index digests. Benefits are exact identity and independence from tags; costs are
less readable Compose files and more coordination when producing upgrades. Do
not retrofit already published installers.

## Supply Chain

Now:

- max-level BuildKit provenance;
- OCI source, revision, version and created labels;
- immutable commit tag and recorded RepoDigests;
- least-privilege workflow permissions.

Later:

- SBOM attestation and policy checks;
- keyless Cosign signing and verification;
- pin third-party actions by full commit SHA;
- installer digest pinning;
- protected `release` environment with a second reviewer.

Build arguments must never carry secrets because provenance can expose build
arguments. Use BuildKit secret mounts if a future build needs secret material.

## Laboratory Tests

Use only versions matching:

```text
0.0.0-pipeline-test-<commit-prefix>
```

The lab mode exists only in `.github/scripts/promote-release-images.sh` and is
not exposed by the production promotion workflow. A valid regression test is:

1. promote digest A to the lab version;
2. repeat digest A and expect idempotent success;
3. preflight digest B against the same lab version and expect hard failure.

Lab tags can share a manifest with an approved image. Never delete a GHCR package
version merely to remove a lab tag, because that can delete the shared manifest.
Retain the clearly named lab tag unless GHCR offers a verified tag-only removal
operation for that package.
