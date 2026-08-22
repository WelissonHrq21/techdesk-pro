# v1.1.0 Image Digest Incident

## Incident

The TechDesk Pro v1.1.0 release had approved API and frontend OCI manifests. When
the final Git tag `v1.1.0` was pushed, the `Release Docker Images` workflow ran
automatically, checked out the tag, rebuilt both images and pushed `1.1.0` and
`v1.1.0` again.

The final Docker tags therefore pointed to newly built manifests instead of the
manifests that had passed the release-candidate validation.

## Impact

Git history, the GitHub Release and installer assets were not changed. The GHCR
tag-to-digest mapping temporarily lost release-candidate traceability. Release
integrity was considered blocked until the mapping was restored.

## Root Cause

One workflow owned two different lifecycle stages:

```text
push Git tag v1.1.0
-> automatic workflow trigger
-> Docker build for API and frontend
-> push :1.1.0 and :v1.1.0
-> approved final tag mappings overwritten
```

The pipeline had no separation between candidate build and final manifest
promotion, no explicit digest gate and no protection against overwriting an
existing final tag with a different digest.

## Recovery

The approved OCI indexes still existed in GHCR by digest. The four final tags
were restored with manifest-only promotion using `docker buildx imagetools
create`. No image was rebuilt. Pulls and content checks then confirmed the
approved API and frontend digests.

The published Git tags, releases, installer assets and v1.0.0 artifacts were not
modified during recovery.

## Preventive Actions

- Git tag pushes no longer trigger image builds.
- Candidate builds are manual, immutable and identified by commit plus RC.
- Final promotion is a separate manual workflow requiring exact digests.
- OCI revision/source labels bind candidates to their source commit.
- All targets pass preflight before promotion.
- Existing final tags are idempotent for the same digest and blocked for a
  different digest.
- A dry-run mode validates a promotion without changing GHCR.
- The official release runbook creates the Git tag only after image promotion.

No individual action caused the incident. The failure was a pipeline design
gap, and the preventive controls are implemented at that same system boundary.
