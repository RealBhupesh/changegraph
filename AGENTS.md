# AGENTS.md — ChangeGraph

## Single source of truth

Before making any product, architecture, implementation, security, testing, roadmap, or behavior decision for ChangeGraph, fetch and read the current Notion page:

**ChangeGraph — Complete Implementation Plan for Cursor Composer**  
https://app.notion.com/p/3d3144f9056e8188816be7cfdcc2ae78?pvs=204

That Notion page is the **only authoritative specification**.

Do not use historical GitHub documentation, deleted files, prior PR descriptions, old plans, chat summaries, cached copies, or earlier architectural decisions as substitutes for the current Notion page.

If a repository fact conflicts with the Notion plan:

1. preserve working user code and data;
2. identify the conflict with concrete evidence;
3. do not silently invent a replacement architecture;
4. update the Notion source of truth when the user approves a change;
5. then implement against the updated Notion plan.

GitHub is for implementation artifacts: source code, tests, fixtures, migrations, CI, and version history. Notion is for the plan.
