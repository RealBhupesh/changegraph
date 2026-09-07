# Supported Semantics

## Evidence States

- `proven`: Requires trusted solver with persisted proof artifact
- `supported`: Requires successful executions with no observed violation
- `falsified`: Confirmed reproducible violation with witness
- `unknown`: Analysis could not determine outcome
- `unsupported`: Verifier capability not available

## Predicate Language

Typed AST with safe integer arithmetic. No eval, Function, or shell interpolation.

Supported operators: `eq`, `ne`, `lt`, `lte`, `gt`, `gte`, `and`, `or`, `not`, `add`, `sub`, `mul`.

Sources: `input`, `base`, `head` with dot-path access.

## Observation Statuses

`returned`, `threw`, `timed-out`, `crashed`, `protocol-error`, `nondeterministic`

## Policy Decisions

- `permit`: All required obligations satisfied with approved binding
- `block`: Required falsification detected
- `needs-review`: Unresolved obligations or missing approval
