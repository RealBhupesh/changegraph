# ChangeGraph Implementation Status

Last updated: 2026-09-07

## Repository State

The repository was initialized with only README.md and AGENTS.md pointing to the Notion implementation plan. The full semantic-delta verification system has been implemented per the Notion specification.

## Implemented Modules

| Module | Package | Status |
|--------|---------|--------|
| Semantic Contract | `@changegraph/semantic-contract` | Complete |
| Obligations | `@changegraph/obligations` | Complete |
| Observables | `@changegraph/observables` | Complete |
| Verifier Core | `@changegraph/verifier-core` | Complete |
| Differential Verifier | `@changegraph/verifier-differential` | Complete |
| Fuzz/Challenge Lab | `@changegraph/verifier-fuzz` | Complete |
| Symbolic Verifier | `@changegraph/verifier-symbolic` | Partial (Z3 adapter stub) |
| Counterexample | `@changegraph/counterexample` | Complete |
| Proof Memory | `@changegraph/proof-memory` | Complete |
| Semantic Delta | `@changegraph/semantic-delta` | Complete |
| Attestations | `@changegraph/attestations` | Complete |
| CLI | `@changegraph/cli` | Complete |
| Web API/UI | `@changegraph/web` | Complete |
| Worker | `@changegraph/worker` | Complete |

## Verification Commands

```bash
pnpm install
pnpm build
pnpm test
pnpm typecheck
```

## Blocked Live Integrations

- **Z3 Solver**: Symbolic verification requires `Z3_PATH` configuration. Returns `unsupported` when not configured.
- **GitHub App**: Webhook/check integration requires `GITHUB_APP_ID` and credentials.
- **PostgreSQL**: Persistence layer uses in-memory stores for local dev. Production requires `DATABASE_URL`.
- **Signing**: Evidence passport signing requires `SIGNING_PROVIDER` configuration.

## Fixture Coverage

- Pricing allowed change (premium 10% → 20%)
- Accidental standard pricing change (falsified preservation)
- No-op change (falsified allowed-relation)
- Invalid discount (falsified property)
- Merge interaction composition violation
- Evidence passport integrity/tampering
- Cross-tenant proof memory isolation
