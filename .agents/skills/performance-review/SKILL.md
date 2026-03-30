---
name: perf-review
description: Use when reviewing code for performance issues, when a developer asks to optimize code, or when investigating slow behavior
---

# Performance Review

Analyze changed code for performance bottlenecks and optimization opportunities.

## When to Use

- Developer asks to check performance or optimize code
- Reviewing code that processes large datasets, handles high traffic, or runs in loops
- After noticing slow behavior in the application

## Steps

1. **Get the changed files and diff:**

```bash
git diff --name-only HEAD~1
git diff HEAD~1
```

2. **Detect the language** from file extensions to apply language-specific analysis.

3. **Read each changed file in full** -- performance issues often depend on surrounding context.

4. **Analyze for these categories:**

   **Time Complexity**
   - Identify O(n^2) or worse algorithms
   - Look for nested loops over the same data
   - Suggest more efficient alternatives

   **Memory Usage**
   - Unnecessary object allocations in hot paths
   - Memory leak potential (unclosed resources, growing caches)
   - Large object copying where references would work

   **I/O Operations**
   - Blocking calls that could be async
   - Missing connection pooling
   - N+1 query patterns
   - Sequential API calls that could be parallelized

   **Caching Opportunities**
   - Repeated expensive computations
   - Cacheable data fetches
   - Missing memoization

5. **Report each issue:**
   - **Impact:** HIGH / MEDIUM / LOW
   - **Location:** `file:line`
   - **Current:** What's happening now
   - **Optimized:** The improved version with code
   - **Expected Gain:** e.g., "~10x faster for large arrays"

## Rules

- Only flag real performance issues, not micro-optimizations.
- Always show the optimized code, not just the problem.
- Consider the actual usage context -- O(n^2) on a 10-item array is fine.
- Prioritize I/O and algorithmic issues over memory micro-optimizations.
