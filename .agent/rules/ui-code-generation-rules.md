---
trigger: always_on
---

# UI Generation & Frontend Engineering Rules

## 1. Rules of Engagement

When asked to build a UI component, you must generate a **stateless** function that only accepts props.

- **NO Data Fetching:** Components must never fetch their own data. Do not use `useEffect` or `fetch` inside a UI component.
- **NO Complex State:** Use `useState` only for trivial, ephemeral UI state (e.g., `isOpen` for a dropdown).
- **Prop-Driven:** Define strict TypeScript interfaces for all component props representing the exact JSON payload expected from the backend API.

## 2. Anti-Patterns

- **Do not write inline styles (`style={{...}}`).**
- **Do not invent complex class-name logic.** Use `clsx` and `tailwind-merge` (standard in shadcn) if conditional classes are necessary.
- **Do not mix business logic into the view layer.**

## 3. Standard Output Format

When executing a UI generation request, always provide:

1. The TypeScript interface for the expected data.
2. The stateless component using the stack laid out in the TDD document
3. (Only if requested) The React/Tanstack Query implementation demonstrating how to pipe data into the component. Only if the component has props.
