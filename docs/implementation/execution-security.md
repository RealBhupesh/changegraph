# Execution Security

> **Status:** execution-facing scaffold required by the canonical implementation brief. This file must describe the real sandbox and trust boundary as it is implemented and verified; it must not overstate container isolation or credential safety.

Canonical source: [`CHANGEGRAPH_COMPLETE_IMPLEMENTATION_PLAN.md`](./CHANGEGRAPH_COMPLETE_IMPLEMENTATION_PLAN.md)

## Current implementation state

No production sandbox provider from the September 6 canonical brief has been implemented or verified yet. Therefore this document makes no claim that untrusted repositories can currently be executed safely.

## Threat model to maintain

Treat repository code, generated artifacts, fixtures supplied by repository code, filenames, archives, worker messages, webhook payloads, and requested revisions as untrusted input.

Trusted components are expected to include the ChangeGraph control plane, policy evaluator, trusted harness, authorization checks, artifact integrity logic, and signing boundary. Actual trust assignments must be updated from implementation evidence.

## Required execution boundary

The canonical brief requires:

- independent base/head environments;
- no inherited host secrets, SSH agent, signing keys, privileged sockets, or ambient cloud credentials;
- bounded CPU, memory, processes, disk, output size, per-case timeout, and run deadline;
- outbound network denied except explicit preparation/fixture allowlists;
- read-only source where practical and bounded writable scratch space;
- isolated mutable filesystem/database state between base and head;
- full descendant-process cancellation on timeout/cancel;
- no silent fallback to unsafe host execution when isolation is unavailable;
- signing credentials outside repository execution sandboxes.

Containers alone must not be documented as a complete hostile-code isolation guarantee.

## Required security verification matrix

Record real tests/results for:

- cross-tenant run/witness/artifact access;
- forged GitHub webhooks;
- untrusted fork privilege escalation;
- command injection;
- path traversal;
- malicious archive extraction;
- oversized/decompression-bomb inputs;
- YAML alias/depth abuse;
- malformed worker protocol messages;
- sandbox credential inheritance;
- resource exhaustion;
- descendant-process cleanup;
- repository attempts to forge `proven` results;
- cross-run artifact substitution;
- XSS through observations/test output/filenames;
- signing-key exposure;
- trust-root substitution.

## Network policy

Document actual preparation allowlists, fixture-local services, DNS behavior, proxying, and enforcement mechanism only after implemented.

## Filesystem policy

Document source mount mode, writable paths, artifact export boundary, symlink policy, archive extraction rules, cleanup guarantees, and path canonicalization only after implemented.

## Credential policy

Document which components may access GitHub credentials, database credentials, artifact-store credentials, sandbox bootstrap tokens, and signing material. Repository processes must never receive signing credentials.

## Cancellation and cleanup

Record implementation behavior for worker cancellation, process trees, worktrees/source bundles, fixture databases, temporary directories, network namespaces, leases, and orphan recovery.

## Verification record

Populate with exact executed security commands/tests and reference [`changegraph-status.md`](./changegraph-status.md). Missing live providers or credentials must be recorded as **blocked**, not passed.
