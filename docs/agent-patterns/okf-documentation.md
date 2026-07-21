---
type: Agent Pattern
title: Documentation and Wiki OKF Standard
description: Standard requiring all project documentation and wikis to follow the Google Open Knowledge Format (OKF).
tags: [okf, documentation, wiki, standard, governance]
timestamp: 2026-07-21T22:07:26Z
---

# Documentation and Wiki OKF Standard

Whenever documentation, guides, architecture notes, or a wiki of any form is stored in this repository, it **must** follow the [Google Open Knowledge Format (OKF)](https://github.com/GoogleCloudPlatform/knowledge-catalog/blob/main/okf/SPEC.md) specification.

## Core Requirements

1. **Format**: Every concept document is a UTF-8 Markdown file containing a YAML frontmatter metadata block at the top delimited by `---`.
2. **Required Frontmatter**:
   ```yaml
   ---
   type: <Concept Type>          # e.g., Agent Pattern, Architecture, Playbook, Reference
   title: <Display Title>        # Human-readable title
   description: <Summary>        # Single-sentence summary of the concept
   tags: [<tag1>, <tag2>]        # Optional tags for categorization
   timestamp: <ISO-8601 Datetime># Optional last modified timestamp
   ---
   ```
3. **Bundle Structure**: Knowledge collections (such as `docs/agent-patterns/`) are self-describing bundles containing an `index.md` listing concepts for progressive disclosure.
4. **Location**: Knowledge bundles and project pattern documentation live under `docs/` (e.g., `docs/agent-patterns/`).
