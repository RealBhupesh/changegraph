# ChangeGraph

> **Know when a change has enough evidence to ship.**

ChangeGraph is a research-driven developer-infrastructure project for understanding and validating software changes.

## Single source of truth

The **only authoritative product, architecture, implementation, security, testing, and roadmap specification** is the Notion page below:

**ChangeGraph — Complete Implementation Plan for Cursor Composer**  
https://app.notion.com/p/3d3144f9056e8188816be7cfdcc2ae78?pvs=204

Do not treat any historical GitHub commit, deleted document, PR description, issue, chat transcript, or cached copy as authoritative when it conflicts with the current Notion page.

Before implementing or changing ChangeGraph, fetch/read the current Notion page first and follow that version.

## Repository role

GitHub contains the code, tests, fixtures, CI configuration, and implementation history.

Notion contains the plan.

If implementation reveals that the plan needs to change, update the Notion source of truth first, then implement the approved change in this repository.
