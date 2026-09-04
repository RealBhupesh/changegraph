# ChangeGraph Architecture Decisions

This file records the decisions that should remain stable unless benchmark evidence shows they are wrong.

## ADR-001 — Deterministic evidence before LLM reasoning

**Decision:** The core analyzer derives impact, test selection, risk, confidence, and safety policy from code structure, test/history evidence, and explicit heuristics. LLMs only summarize evidence or propose reviewable remediation.

**Why:** A test-selection product needs reproducibility and auditability. An LLM-only selector cannot reliably explain or reproduce why validation was skipped.

**Consequence:** ChangeGraph remains useful with model access disabled.

---

## ADR-002 — Risk and confidence are separate values

**Decision:** Never collapse risk and confidence into one score.

**Why:** A large, well-understood change can be high risk and high confidence; a small-looking dynamic/config change can be low apparent risk but low confidence. Safety policy needs both dimensions.

**Consequence:** The UI, report schema, benchmarks, and policy engine expose both.

---

## ADR-003 — TypeScript Compiler API is the V1 semantic engine

**Decision:** Use the TypeScript Compiler API for deep TypeScript/JavaScript indexing before adding generic parsers.

**Why:** V1 is intentionally narrow, and the compiler already understands TypeScript syntax, symbols, types, and module resolution. A generic parser would require reimplementing semantic resolution that TypeScript already provides.

**Alternative considered:** Tree-sitter first.

**Why not now:** Tree-sitter is excellent for broad incremental syntax parsing but does not by itself provide TypeScript's semantic/type/module-resolution model.

**Future:** SCIP/Tree-sitter adapters can expand language coverage without changing core graph/report/policy packages.

---

## ADR-004 — PostgreSQL plus in-memory traversal, not a graph database

**Decision:** Persist normalized graph facts/history in PostgreSQL and load/build adjacency structures for the repository revision being analyzed.

**Why:** V1 graph operations are bounded and repository-local. Introducing Neo4j or another graph database before measuring a real bottleneck adds operational complexity without proving product value.

**Promotion criterion:** Revisit only if benchmark data shows graph loading/traversal or cross-repository querying cannot meet product requirements with the existing design.

---

## ADR-005 — Progressive trust: Observe -> Recommend -> Optimize

**Decision:** A repository cannot start by skipping tests.

**Why:** Test impact analysis must be calibrated against the repository's real full-suite behavior. Shadow mode measures false negatives before optimization becomes authoritative.

**Default promotion recommendation:** at least 50 comparable full-suite observations, >=99% failing-test recall on supported change classes, no unresolved systematic miss class, plus explicit repository-owner opt-in.

These are gating defaults/targets, not claims about current performance.

---

## ADR-006 — Hard fallbacks are a feature

**Decision:** Certain change classes force full validation regardless of ranking score.

Examples include test-runner config, dependency lockfiles, relevant compiler/module-resolution config, broad schema/migration changes, graph truncation, unsupported adapters, and excessive parser/resolution failure.

**Why:** Optimization should stop where ChangeGraph's evidence becomes structurally unreliable.

---

## ADR-007 — GitHub Check is the primary product surface

**Decision:** The first user-visible result is a GitHub Check, not the dashboard.

**Why:** Reviewers already work in pull requests. GitHub Checks support structured status and annotations, while a separate dashboard is best used for deeper graph exploration and calibration trends.

---

## ADR-008 — Vitest/Jest selection starts at test-file granularity

**Decision:** V1 may discover individual test cases, but the first safe execution unit is the test file.

**Why:** Named-test filtering can be framework/config dependent, while file-level selection provides a simpler and more reproducible contract. More granular selection should be introduced only after adapter-specific verification.

---

## ADR-009 — Historical correlation is a ranking signal, not proof

**Decision:** Historical co-failure/co-change data improves ranking but cannot prove a test is irrelevant.

**Why:** History is sparse for new repositories and can be invalidated by architecture changes. Static evidence and safety policy remain foundational.

**Technique:** Bayesian smoothing plus recency decay prevents tiny/ancient samples from dominating.

---

## ADR-010 — Random/audit exploration is necessary

**Decision:** Calibration includes execution of some tests that the selector ranks low.

**Why:** A system that never runs tests it believes are irrelevant cannot discover blind spots. Exploration creates evidence about missed relationships and reduces feedback-loop overconfidence.

---

## ADR-011 — Hosted test execution uses an explicit isolation boundary

**Decision:** Repository tests are treated as arbitrary untrusted code and execute outside the web/API process.

**MVP:** disposable Docker execution with explicit CPU/memory/time/output limits and no host credentials.

**Post-MVP agent remediation:** use a `SandboxBackend`, with Docker Sandboxes as a natural implementation where supported.

**Why:** A developer tool that executes arbitrary PR code must make isolation a first-class architecture boundary.

---

## ADR-012 — Agent remediation is downstream of evidence

**Decision:** Do not build the “fix with agent” experience before the impact/test engine and benchmark harness are trustworthy.

**Why:** The project's defensible value is change intelligence. Building agent UI first would turn it into another generic coding-agent wrapper.

---

## ADR-013 — No unmeasured performance claims

**Decision:** README/portfolio/outreach metrics must be generated from reproducible benchmark runs.

**Why:** The project has ambitious targets, but credibility requires distinguishing design goals from measured results.

---

## ADR-014 — Architecture may change only through evidence

If a future implementation wants to replace a major decision, the change should include:

1. observed benchmark/operational evidence;
2. an updated design decision;
3. spec/implementation-plan changes;
4. tests expressing the new invariant;
5. migration/compatibility implications.

This keeps the repository from becoming an accumulation of agent-generated technology choices.
