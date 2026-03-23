---
trigger: always_on
---

# Git Rules

- Check if inside existing repo: `git rev-parse --is-inside-work-tree`
- Never run `git init` in subdirectories
- Never commit `.git` folders
- This is a monorepo: root = main project, frontend/ and backend/ are subdirectories only
