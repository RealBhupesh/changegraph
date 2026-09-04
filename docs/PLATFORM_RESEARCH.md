# ChangeGraph Platform Expansion Research

This document records the external research used to design the MCP, GitHub Copilot custom-agent, Marketplace, ChangeBench, Intent Drift, and Minimum Evidence Testing expansion.

The intent is not to copy current vendor behavior. It is to use current platform capabilities and research patterns to avoid designing features GitHub/MCP clients cannot actually support.

---

# 1. GitHub Copilot custom agents

GitHub currently supports custom agents defined as Markdown agent profiles with YAML frontmatter.

Relevant capabilities include:

- agent `name` and required `description`;
- target environments such as `github-copilot`;
- explicit tool allowlists;
- MCP server configuration in the agent profile;
- user-invocable and model-invocation controls;
- repository/organization/enterprise layering;
- versioning based on the agent profile's Git commit SHA.

Design consequence for ChangeGraph:

> Ship a declarative ChangeGraph Reviewer agent that consumes ChangeGraph MCP tools instead of embedding a separate impact-analysis implementation inside the agent prompt.

This gives ChangeGraph one analysis core and many agent consumers.

Authoritative source:

https://docs.github.com/en/copilot/reference/custom-agents-configuration

---

# 2. GitHub repository MCP configuration

GitHub allows MCP servers to be configured for repository use by Copilot cloud agent and Copilot code review.

Important current constraints/behavior:

- MCP tools can be invoked autonomously by Copilot;
- GitHub explicitly recommends allowlisting read-only tools;
- GitHub's cloud agent/code review support MCP **tools** rather than all MCP capability classes;
- remote MCP servers can use configured headers/secrets;
- OAuth-based remote MCP authentication has current GitHub-specific limitations that must be rechecked at implementation time;
- repository settings and custom-agent profiles can both contribute MCP configuration.

Design consequence:

> ChangeGraph's first MCP release must be read-only by default and designed around narrowly scoped tools rather than a generic `execute_changegraph_command` tool.

Authoritative source:

https://docs.github.com/en/copilot/how-tos/copilot-on-github/customize-copilot/configure-mcp-servers

---

# 3. MCP 2026-07-28 protocol line

The current MCP 2026-07-28 release moved the protocol core toward stateless request/response operation and introduced updated routing/caching/authorization behavior.

Relevant design signals:

- stateless server core;
- self-describing requests;
- current TypeScript SDK v2 aligned with the 2026-07-28 specification;
- tool schemas use modern JSON Schema capabilities;
- OpenTelemetry is appropriate for structured observability in the evolving MCP ecosystem;
- MCP is a cross-client interoperability surface rather than a product-specific agent protocol.

Design consequence:

> Hosted ChangeGraph MCP should keep transport stateless and make every tool result independently schema-versioned and authorization-scoped.

Sources:

- https://blog.modelcontextprotocol.io/posts/2026-07-28/
- https://ts.sdk.modelcontextprotocol.io/v2/

---

# 4. GitHub Check Runs and requested actions

GitHub Check Runs are especially important because write access to Checks is a GitHub App capability and requested actions can render buttons directly in the Checks UI.

When a user clicks a requested action, GitHub emits a `check_run.requested_action` webhook containing the action identifier.

Design consequence:

ChangeGraph can expose native actions such as:

```text
Run full suite
Generate regression test
Investigate impact
Attempt candidate fix
```

without inventing a separate action UI for every workflow.

Every requested action must remain bound to the exact PR head/report that produced the button; stale-head requests must be rejected.

Authoritative source:

https://docs.github.com/en/rest/guides/using-the-rest-api-to-interact-with-checks

---

# 5. GitHub Marketplace App requirements

GitHub Marketplace App listings currently require, among other things:

- public availability;
- actual GitHub platform value beyond authentication;
- publisher contact information;
- description;
- a pricing plan;
- privacy policy;
- support contact/link;
- valid additional links;
- plan/cancellation event handling through Marketplace integration;
- branding/listing assets.

Paid App publication has additional organization/publisher/install requirements.

Design consequence:

> ChangeGraph should launch free first, solve correctness/adoption/support, and defer billing until the product earns it.

Sources:

- https://docs.github.com/en/apps/github-marketplace/creating-apps-for-github-marketplace/requirements-for-listing-an-app
- https://docs.github.com/en/apps/github-marketplace/github-marketplace-overview/about-github-marketplace-for-apps

---

# 6. GitHub Actions Marketplace

GitHub Actions have a separate Marketplace path from Apps.

Current publication guidance includes:

- public repository;
- one root action metadata file for the listed action;
- unique action name;
- release/tag-based publication;
- Marketplace Developer Agreement/2FA requirements.

Design consequence:

> ChangeGraph Action should eventually live in a separate public repository rather than burying `action.yml` inside the main monorepo.

Authoritative source:

https://docs.github.com/en/actions/how-tos/create-and-publish-actions/publish-in-github-marketplace

---

# 7. Why ChangeBench is strategically necessary

Selective testing products have an asymmetric risk profile.

A system can look impressive while saving 80% of tests and still be useless if the omitted 20% contains failures.

The key research discipline is therefore not average accuracy. It is **failure recall under realistic historical replay**.

ChangeBench should enforce:

- temporal anti-leakage;
- transparent baselines;
- separate safety and efficiency metrics;
- case-level miss taxonomy;
- reproducible tool/config versions;
- public distinction between benchmark targets and achieved numbers.

This turns ChangeGraph's core claim into a falsifiable engineering proposition.

---

# 8. Why static graph + history is stronger than either alone

Static dependency analysis answers structural reachability but misses dynamic behavior and implicit relationships.

Historical test-failure correlation captures runtime relationships but suffers from cold start, topology drift, and confounding.

The combined design is therefore:

```text
static structure
+ test/coverage relationships
+ historical co-failure/co-change
+ repository policy
+ explicit uncertainty
```

ChangeGraph should benchmark each component as an ablation so the project can demonstrate which signals actually improve recall or reduce validation cost.

---

# 9. Intent Drift as a distinct signal

Intent Drift should not be treated as generic LLM code review.

Its research value comes from comparing two explicit structures:

```text
declared scope
vs
observed impact graph
```

Potential measurable questions:

- Do high-drift PRs fail more often?
- Do agent-authored PRs exhibit different drift distributions?
- Does drift identify public API/security/data-boundary changes that reviewers miss?
- Does drift add predictive value after controlling for change size/fanout?

This allows Intent Drift to become benchmarkable rather than anecdotal.

---

# 10. Minimum Evidence Testing as optimization

Traditional selective testing asks:

> Which tests are likely relevant?

ChangeGraph's stronger question is:

> Which validation actions provide enough evidence at the lowest expected cost?

That allows heterogeneous actions:

```text
unit tests
integration suites
typecheck
build
schema checks
sentinels
full suite
```

The first algorithm should remain conservative and interpretable.

A greedy marginal-evidence-per-cost planner is preferable to an opaque optimizer for V1 because:

- every selection can be explained;
- constraints are straightforward;
- overlap can be measured;
- benchmark ablations are easier;
- bugs are easier to detect.

Only introduce more sophisticated mathematical optimization after ChangeBench demonstrates a measurable limitation.

---

# 11. Agent provenance as an empirical dimension

ChangeGraph should record author provenance only when reliable platform metadata exists.

The purpose is research, calibration, and product insight, not a hard-coded trust penalty.

Questions ChangeBench may evaluate:

- change size by provenance;
- blast radius by provenance;
- intent-drift rate;
- historical failure rate;
- amount of validation required;
- remediation success rate.

The product must never assume agent-authored code is inherently lower quality.

---

# 12. Research questions worth publishing

If ChangeGraph becomes technically mature, these could become public engineering writeups or papers.

## RQ1 — Symbol-level vs package-level impact analysis

How much additional failing-test recall or test reduction does symbol-level analysis provide over package-level affected graphs?

## RQ2 — Historical evidence value

How much does temporally valid failure history improve test selection over static structure alone?

## RQ3 — Confidence calibration

Does ChangeGraph confidence meaningfully predict the probability that the selected evidence plan captures full-suite failures?

## RQ4 — Minimum evidence planning

Can heterogeneous validation planning reduce wall-clock/compute cost beyond test-only selection without hurting safety?

## RQ5 — Intent drift

Does detected divergence between declared and actual impact predict review defects or CI failures?

## RQ6 — Human vs agent-authored changes

After controlling for size and affected area, do different author-provenance classes require different validation patterns?

## RQ7 — Repository trust

Can a repository-specific calibration state safely determine when selective CI should be enabled or suspended?

---

# 13. Research publication standard

Any public ChangeGraph research result must include:

- dataset definition/version;
- inclusion/exclusion criteria;
- repository license/source details;
- benchmark commit SHA;
- analyzer/config versions;
- temporal cutoff methodology;
- baseline definitions;
- confidence intervals where statistically appropriate;
- miss examples;
- limitations;
- raw/reproducible aggregate data where licensing/privacy permits.

No marketing chart should hide false-safe cases or merge synthetic fixtures with real-world results.
