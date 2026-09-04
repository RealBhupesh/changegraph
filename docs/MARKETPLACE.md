# ChangeGraph GitHub Marketplace Launch Plan

This document translates current GitHub Marketplace requirements into product and engineering work for ChangeGraph.

The initial Marketplace launch should be a **free GitHub App**. The GitHub Action is published separately through the Actions Marketplace path.

---

# 1. Marketplace products

## Product A — ChangeGraph GitHub App

Primary hosted experience.

Capabilities:

- PR webhooks;
- Check Runs;
- line annotations;
- requested actions;
- repository trust history;
- dashboard links;
- optional hosted selective validation;
- later remediation requests.

## Product B — ChangeGraph Action

Separate public repository for teams that prefer workflow-native/self-hosted adoption.

Capabilities:

- analyze base/head range;
- output report JSON;
- output selected tests/evidence plan;
- optionally upload report artifact;
- optionally post summary through workflow permissions.

The Action repository should contain one root `action.yml` when prepared for Marketplace publication.

---

# 2. Current GitHub App Marketplace requirements translated to ChangeGraph

Before submitting the App listing, ChangeGraph must satisfy the following.

## Public availability

- App is installable without invitation.
- Production service is not labeled private preview/invite-only.
- Installation documentation is public.

## Real GitHub platform value

ChangeGraph integrates beyond authentication through:

- pull request webhooks;
- Check Runs;
- annotations;
- requested actions;
- installation-scoped repository analysis.

## Publisher contact

Provide a stable publisher identity and valid public contact route.

Required surfaces:

```text
/support
support email
publisher/contact information
```

## Pricing plan

Initial plan:

```text
Free — $0
```

The listing must still specify the plan clearly.

## Privacy policy

Public URL:

```text
/privacy
```

The policy must describe at minimum:

- repository metadata processed;
- source code processing behavior;
- retention/cache behavior;
- GitHub installation data;
- test result/history data;
- model-provider data flow if AI explanation is enabled;
- telemetry;
- deletion/uninstall behavior;
- subprocessors if applicable;
- security/contact process.

## Support

Public URL or email:

```text
/support
```

The page should include:

- installation issues;
- incorrect analysis/reporting;
- security issues;
- data deletion;
- response expectations;
- troubleshooting links.

## Additional links

If provided, all must resolve and be relevant:

```text
/terms
/status
/docs
/docs/install
/docs/uninstall
```

## Marketplace event readiness

The hosted app must implement the required Marketplace webhook handling relevant to plan changes/cancellations before submission.

Events must be idempotent and auditable.

---

# 3. Paid-plan gate

Do not build billing in the MVP.

A paid Marketplace plan is considered only when all are true:

- ChangeGraph App is owned by a GitHub organization;
- organization publisher verification is complete;
- GitHub's then-current paid-app installation/user thresholds are satisfied;
- benchmark evidence is strong;
- hosted reliability is measured;
- customer support is operational;
- privacy/terms/security posture is mature;
- plan-change event handling is production-tested.

If/when paid plans launch, ChangeGraph must comply with GitHub's then-current billing and plan requirements rather than relying on assumptions frozen in this document.

---

# 4. GitHub organization strategy

Before public Marketplace launch, create a product organization such as:

```text
changegraph-ai
```

Suggested eventual repositories:

```text
changegraph-ai/changegraph
changegraph-ai/changegraph-action
changegraph-ai/changebench
changegraph-ai/examples
```

Do not transfer the current repository merely for aesthetics before:

- core implementation exists;
- CI is stable;
- repository is ready to become public;
- product naming is confirmed.

A repository transfer later preserves GitHub redirects, but Marketplace-specific ownership/publisher rules must be checked at launch time.

---

# 5. Listing content

## Proposed name

**ChangeGraph**

## One-line description

> Know what your code can break.

## Short description

> Change intelligence for pull requests. ChangeGraph maps code changes to their blast radius, recommends the minimum safe validation, and gives humans and coding agents evidence about what needs attention.

## Primary benefits

1. Understand blast radius at symbol level.
2. Select tests using evidence, not filenames alone.
3. Fall back safely when ChangeGraph does not understand enough.
4. Explain every decision.
5. Measure CI savings against full validation.
6. Give coding agents structured change intelligence through MCP.

---

# 6. Required screenshots/assets

Create product-quality screenshots from a real demo repository.

## Screenshot 1 — GitHub Check summary

Show:

- risk;
- confidence;
- intent drift;
- selected tests;
- decision;
- requested action buttons.

## Screenshot 2 — Interactive impact graph

Show:

- changed symbol;
- callers/dependents;
- route/API impact;
- tests;
- edge provenance.

## Screenshot 3 — Why this test?

Show one selected test with:

- graph path;
- history evidence;
- confidence contribution;
- estimated cost.

## Screenshot 4 — Repository Trust

Show:

- trust state;
- comparable shadow runs;
- failure recall;
- fallback rate;
- savings;
- recent misses if any.

## Screenshot 5 — Copilot / MCP

Show a ChangeGraph Reviewer agent answering:

```text
What can this PR break?
```

with evidence-linked output.

---

# 7. Customer experience requirements

## Install flow

Target:

```text
Marketplace -> Install -> choose repositories -> first PR analyzed
```

No mandatory onboarding call.

## First-run behavior

New installations are automatically:

```text
Observe / Advisory
```

ChangeGraph must not promise immediate selective CI savings before calibration.

## Uninstall behavior

On uninstall:

- revoke/stop installation access immediately;
- stop queued work requiring access;
- remove stored installation tokens/secrets;
- follow documented data retention/deletion policy;
- preserve only legally/operationally required audit data if applicable and documented.

## Failure behavior

If ChangeGraph is unavailable:

- it never produces a false success;
- existing CI remains usable;
- hosted failure should not block a repository by default unless a customer explicitly configures ChangeGraph as required.

---

# 8. Security checklist before Marketplace submission

- GitHub webhook HMAC verified against raw body.
- Delivery IDs deduplicated.
- Installation tokens short-lived and never logged.
- Repository access checked per request/tool call.
- Least-privilege GitHub App permissions documented.
- No source code or secrets in telemetry.
- Test execution isolated from API/web process.
- Remediation agent isolated from host filesystem.
- Write actions require explicit user interaction and policy authorization.
- Stale PR-head remediation requests rejected.
- Dependency/security scanning enabled.
- Security policy and vulnerability reporting channel public.
- Incident response owner/contact defined.

---

# 9. Proposed GitHub App permissions

Exact permissions must be revalidated against implementation, but design toward least privilege.

Likely repository permissions:

```text
Contents: Read
Metadata: Read
Pull requests: Read
Checks: Read & Write
Actions: Read (only if required for historical/test integration)
Commit statuses: Read (only if required)
```

Avoid requesting administration, secrets, or write-to-contents permissions for the normal advisory product.

Candidate-fix PR creation should use a separate explicit capability path and only request additional permission if it is truly required.

---

# 10. Action Marketplace plan

The Action is published from a separate public repository.

Minimum repository shape:

```text
action.yml
README.md
dist/ or runtime code
LICENSE
SECURITY.md
```

Example usage:

```yaml
name: ChangeGraph
on:
  pull_request:

jobs:
  impact:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - uses: changegraph-ai/changegraph-action@v1
        id: changegraph
        with:
          base: ${{ github.event.pull_request.base.sha }}
          head: ${{ github.event.pull_request.head.sha }}

      - run: echo '${{ steps.changegraph.outputs.selected-tests }}'
```

Marketplace publication should use immutable release tags plus a maintained major tag such as `v1` only after release automation/tests are established.

---

# 11. Launch gates

ChangeGraph App is ready to submit only when:

- [ ] public production app is installable;
- [ ] advisory analysis works on multiple public repositories;
- [ ] Check Runs/annotations work reliably;
- [ ] requested actions are authenticated/idempotent;
- [ ] privacy policy is live;
- [ ] support route is live;
- [ ] pricing page/plan is live;
- [ ] install/uninstall docs are live;
- [ ] security policy is live;
- [ ] Marketplace event handling is tested;
- [ ] screenshots/feature card/logo are production quality;
- [ ] all listing links resolve;
- [ ] public benchmark page clearly distinguishes targets from measured results;
- [ ] no known systematic false-safe class remains hidden.

The Action is ready to publish when:

- [ ] separate public repository exists;
- [ ] one root action metadata file exists;
- [ ] action name is available/valid;
- [ ] clean-room example workflow passes;
- [ ] release tags are immutable;
- [ ] README documents permissions and data behavior;
- [ ] Marketplace Developer Agreement prerequisites are satisfied.

---

# 12. Current authoritative sources

Revalidate these before launch because GitHub Marketplace policies can change.

- GitHub Marketplace App requirements: https://docs.github.com/en/apps/github-marketplace/creating-apps-for-github-marketplace/requirements-for-listing-an-app
- About Marketplace Apps: https://docs.github.com/en/apps/github-marketplace/github-marketplace-overview/about-github-marketplace-for-apps
- Listing an App: https://docs.github.com/en/apps/github-marketplace/listing-an-app-on-github-marketplace
- Publisher verification: https://docs.github.com/en/apps/github-marketplace/github-marketplace-overview/applying-for-publisher-verification-for-your-organization
- Publishing Actions: https://docs.github.com/en/actions/how-tos/create-and-publish-actions/publish-in-github-marketplace
