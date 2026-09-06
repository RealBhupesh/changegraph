# Supported Semantics

> **Status:** execution-facing scaffold required by the canonical implementation brief. This file must describe only semantics that are actually implemented and verified. Unsupported behavior must remain explicit.

Canonical source: [`CHANGEGRAPH_COMPLETE_IMPLEMENTATION_PLAN.md`](./CHANGEGRAPH_COMPLETE_IMPLEMENTATION_PLAN.md)

## Current implementation state

No semantic-delta production implementation from the September 6 brief has been completed yet. Therefore no TypeScript subset, observable adapter, symbolic model, comparator, or verifier behavior is currently claimed as supported here.

## Sections to maintain as implementation progresses

### Contract predicate semantics

Record the implemented operand/predicate grammar, numeric rules, missing-path behavior, exact-value semantics, exception handling, invalid-expression handling, limits, and canonicalization behavior.

### Input-domain semantics

Record supported field types, safe-integer bounds, enum/nullability behavior, step semantics, satisfiability handling, and explicit unsupported domains.

### Observable semantics

For each implemented adapter, document exact observation statuses, normalization behavior, comparison rules, ordering guarantees, special values, nondeterminism handling, and unsupported effects.

Expected adapters from the canonical plan:

- function fixture;
- HTTP fixture;
- state-transition fixture;
- PostgreSQL effect fixture.

### TypeScript verification subset

When Unit I becomes real, document the admitted TypeScript/JavaScript subset and the exact rejection reasons for unsupported constructs. Do not describe a construct as modeled unless IR differential tests against actual JavaScript execution support that claim.

### Symbolic / SMT semantics

Record integer/number modeling assumptions, nullability/enum encodings, inlining limits, domain non-vacuity checks, solver version/configuration, `SAT`/`UNSAT`/`UNKNOWN` interpretation, replay requirements, and the distinction between solver receipts and independently checkable proof artifacts.

### Evidence-state semantics

Maintain the exact implemented meaning of:

```text
proven
supported
falsified
unknown
unsupported
```

Tests/fuzzing must never be documented as producing `proven` unless the canonical brief is explicitly revised.

### Policy semantics

Record the authoritative mapping from obligation results and approvals to:

```text
permit
block
needs-review
```

Do not duplicate frontend-specific interpretations.

## Verification record

Populate this section only with executed tests/commands and link corresponding entries in [`changegraph-status.md`](./changegraph-status.md).
