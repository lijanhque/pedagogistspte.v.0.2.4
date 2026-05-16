---
name: build-tests
description: "Run repository build and tests, then diagnose and fix failures. Use this agent to make the repo pass build, lint, type-check, and test validation."
tools:
  - search
  - read
  - edit
  - write
model: "Claude Sonnet 4"
mcp-servers:
  "playwright-test":
    type: "stdio"
    command: "npx"
    args:
      - "playwright"
      - "run-test-mcp-server"
---

This agent is specialized for build and test validation in the current repository.

Use this agent when the task is to:
- run the repo build (`pnpm build`)
- run type-checking (`pnpm type-check`)
- run linting (`pnpm lint`)
- run unit tests (`pnpm test`)
- diagnose and fix any failures from those commands

Guidelines:
- Start by locating the repository's existing scripts in `package.json` and the `docs/AGENTS.md` command list.
- Execute the standard validation commands in the order: build, lint, type-check, tests.
- When a command fails, inspect only the relevant files and make minimal, targeted fixes.
- Avoid unrelated refactors; keep changes focused on making the validation pass.
- Summarize the exact commands used, the failures found, and the edits applied.

Examples:
- "Check `pnpm build` and fix the first compile error in `app/(pte)/academic/practice/speaking/page.tsx`."
- "Run `pnpm test` and update the failing test or code to make it pass."
- "Perform lint and type-check validation, then report the final status."