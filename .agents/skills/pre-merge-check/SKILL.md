---
name: pre-merge-check
description: Use before merging a feature branch to main, or when a developer asks for a final check, merge readiness review, or pre-merge validation
---

# Pre-Merge Checklist

Comprehensive validation before merging a feature branch. Checks code quality, tests, types, documentation, and breaking changes.

## When to Use

- Before merging any feature branch to main
- Developer asks "is this ready to merge?"
- Final review before creating a release

## Steps

1. **Get the full scope of changes:**

```bash
git log --oneline main...HEAD
git diff --stat main...HEAD
```

2. **Run through each checklist category:**

### Code Quality

- [ ] No `console.log`, `debugger`, or debug code left behind
- [ ] No commented-out code blocks
- [ ] No TODO/FIXME without a linked issue
- [ ] Error handling is present for failure cases
- [ ] No hardcoded secrets, API keys, or credentials

### Tests

- [ ] New code has corresponding tests
- [ ] Check if tests exist for changed files:

```bash
git diff --name-only main...HEAD
```

Then look for matching test files (`.test.ts`, `_test.go`, `test_*.py`).

- [ ] Tests cover the happy path and at least one edge case

### Types and Build

- [ ] No `any` types (TypeScript) without justification
- [ ] Check for type errors:

```bash
npx tsc --noEmit 2>&1 | head -20
```

### Documentation

- [ ] Public API changes have updated docs
- [ ] Breaking changes are documented in the PR description
- [ ] New environment variables are documented

### Breaking Changes

- [ ] API endpoint changes are backward-compatible (or flagged)
- [ ] Database schema changes have migrations
- [ ] Config file format changes are documented

3. **Provide a merge readiness assessment:**

**Ready to merge:** Yes / No / With fixes

**Passing:**

- [List what's good]

**Needs attention:**

- [List what needs fixing before merge]

**Verdict:** [1-2 sentence recommendation]

## Rules

- This is a final gate check, not a code review. Focus on merge readiness, not code style.
- Check for files that shouldn't be committed: `.env`, `node_modules`, `.DS_Store`.
- If tests exist, try to run them. If they fail, report which ones.
- Be decisive. Give a clear Yes/No/With-fixes verdict.
