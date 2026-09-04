# ChangeGraph Portfolio and Recruiter Demo Strategy

ChangeGraph is being built as a real developer-infrastructure product, but it should also communicate Bhupesh's strongest engineering qualities quickly to hiring teams at GitHub, GitLab, Docker, Sourcegraph, Supabase, Vercel, Sentry, Grafana, OpenAI, Cohere, and similar companies.

The demo must therefore optimize for **credible technical depth**, not theatrical AI output.

---

## 1. The 60-second story

> “Coding agents make code changes faster than teams can reason about their blast radius. ChangeGraph builds a semantic dependency graph for a pull request, maps changed symbols to affected tests, combines static evidence with historical failure data, and runs the smallest test set it can justify. If confidence is low, it falls back to full CI. The AI layer only explains evidence or proposes a sandboxed fix; it is not the source of truth.”

That sentence should be understandable to a recruiter and interesting to an infrastructure engineer.

---

## 2. The five-minute live demo

### Scene 1 — Open a real PR

Show a PR modifying an authentication/session function.

Do not explain the architecture first. Let the product react.

### Scene 2 — GitHub Check appears

Show:

```text
ChangeGraph
Risk: High (78/100)
Confidence: 92%
Selected: 34 / 312 tests
Expected test reduction: 89%
```

Then show the exact safety decision.

### Scene 3 — Show the impact path

Click one selected test and expose:

```text
refreshSession()
<- AuthService.refresh()
<- authMiddleware()
<- dashboard route
<- dashboard-auth.test.ts
```

Explain that this path is deterministic graph evidence, not an LLM guess.

### Scene 4 — Show a hard fallback

Open a second PR that changes `pnpm-lock.yaml` or `vitest.config.ts`.

ChangeGraph should say:

```text
Full-suite fallback
Reason: test/dependency configuration changed
```

This is one of the most important demo moments. It demonstrates engineering restraint.

### Scene 5 — Benchmark

Show full CI vs ChangeGraph on a benchmark case:

```text
Full suite         312 tests    9m 48s
ChangeGraph         34 tests    2m 07s
Failure recall      100% on this benchmark case
```

Never hard-code impressive numbers. The UI must source them from actual recorded runs.

### Scene 6 — Optional agent remediation

Only after the core is mature:

- ChangeGraph detects a missing test path.
- User clicks `Generate regression test`.
- An isolated sandbox starts.
- Agent adds a test.
- ChangeGraph runs relevant validation.
- User sees the diff.

The user must click again before a branch/PR is created.

---

## 3. What different companies should notice

### GitHub

- GitHub App architecture;
- Checks API;
- PR-native workflow;
- Actions/test intelligence;
- coding-agent validation.

### GitLab

- selective CI;
- DevSecOps policy;
- change intelligence;
- test optimization;
- traceable safety decisions.

### Docker

- untrusted test execution isolation;
- sandbox backend;
- agent remediation inside an isolated environment;
- developer workflow integration.

### Sourcegraph

- semantic code graph;
- symbol/reference traversal;
- potential SCIP adapter;
- code-intelligence UX.

### Supabase

- PostgreSQL data model;
- incremental history;
- globally distributed event-driven backend;
- potentially self-hostable indexing path later.

### Vercel

- polished Next.js product surface;
- developer-experience focus;
- real-time PR feedback;
- AI that is integrated into a product rather than bolted on.

### Sentry / Grafana

- instrumentation;
- traces and metrics;
- regression intelligence;
- failure history and reliability engineering.

### OpenAI / Cohere / AI infrastructure teams

- AI coding-agent validation;
- evidence-grounded model use;
- structured outputs;
- sandboxed remediation;
- measurable evaluation rather than subjective demos.

---

## 4. Portfolio case-study structure

The portfolio page should use this order.

### Hero

**ChangeGraph**  
*AI-native change intelligence for pull requests.*

Short subhead:

> Maps code changes to affected systems and tests, selectively runs CI when the evidence is strong enough, and falls back safely when it is not.

### Problem

Explain the mismatch between faster code generation and expensive/opaque validation.

### Key engineering decision

> “I intentionally separated risk from confidence and made low confidence trigger broader validation. The LLM is not allowed to lower risk or suppress a fallback.”

This is a stronger engineering signal than listing model providers.

### Architecture

Use the system diagram from the README.

### Deep-dive 1 — Semantic graph

Show source code -> symbol nodes -> callers -> tests.

### Deep-dive 2 — Safety policy

Show the exact deterministic fallback rules.

### Deep-dive 3 — Benchmark methodology

Show how historical/full-suite runs are used to measure failing-test recall and CI reduction.

### Deep-dive 4 — GitHub-native UX

Show the Check, annotations, and graph.

### Results

Only publish measured results:

- failing-test recall;
- tests skipped;
- wall-clock reduction;
- fallback rate;
- number/size of benchmark repositories.

### What failed / what changed

Document at least one approach that underperformed and why it was changed. Examples may eventually include:

- overly broad import traversal;
- path heuristics producing noise;
- symbol identities invalidated by refactors;
- historical model overfitting;
- dynamic-import misses.

Do not manufacture failures for storytelling. Use real project history.

---

## 5. Public benchmark repository

Create or include a reproducible benchmark fixture with intentional regressions.

Recommended scenarios:

1. direct dependency regression;
2. transitive dependency regression;
3. unrelated file change;
4. exported API signature change;
5. shared utility high-fanout change;
6. dynamic import that forces lower confidence;
7. lockfile/configuration hard fallback;
8. flaky unrelated test;
9. monorepo package dependency;
10. test-only change.

For each scenario, store:

- base/head SHA;
- expected changed symbols;
- expected affected tests;
- full-suite result;
- ChangeGraph result;
- fallback expectation;
- measured runtime.

This makes claims independently inspectable.

---

## 6. README badges and metrics

Do not add vanity badges before they represent something real.

Useful future badges:

- CI status;
- benchmark failing-test recall;
- test-count reduction on the controlled benchmark;
- supported languages/runners;
- latest release.

Avoid dozens of technology badges.

---

## 7. Launch-quality repository checklist

Before sending ChangeGraph to recruiters or maintainers:

- README explains product in < 30 seconds;
- architecture diagram renders correctly;
- demo GIF/video exists;
- public demo repository can reproduce a report;
- one-command local analysis path works;
- GitHub App setup is documented;
- benchmark methodology is transparent;
- tests and CI are green;
- issues/roadmap are organized;
- no secrets are committed;
- no generated AI prose claims unmeasured performance;
- screenshots contain readable data;
- repository license and contribution policy are explicit.

---

## 8. Resume bullet once the MVP is real

Do not use this until the corresponding measurements exist.

A strong eventual bullet shape is:

> Built ChangeGraph, a GitHub-native change-impact and selective-CI engine that maps TypeScript symbol dependencies to tests, uses deterministic safety fallbacks, and reduced executed tests by **X%** while retaining **Y% failing-test recall** across **N** benchmark PRs.

The variables must be generated from real benchmark results.

---

## 9. What makes this project impressive

The project should communicate these traits:

- understands compiler/static-analysis concepts;
- understands test infrastructure and CI;
- understands product UX;
- understands API/event-driven architecture;
- understands security boundaries for untrusted code;
- understands AI limitations and uses models responsibly;
- measures correctness/performance;
- can say “I don't know” in software through explicit confidence/fallback logic;
- can ship a polished developer-facing product.

If ChangeGraph communicates those signals clearly, it is far more valuable to the job campaign than several additional generic full-stack applications.
