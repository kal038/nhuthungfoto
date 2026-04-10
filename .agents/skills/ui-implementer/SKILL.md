---
name: ui-implementer
description: Use when prompted to generate React components, ensuring a strict stateless Container/Presenter architecture.
---

## When to Use
- Whenever tasked with generating anything UI based on some spec
- Developer provides a JSON payload or TypeScript interface and asks for a UI component to visualize it
- Task involves creating a new screen, table, or dashboard element
- You are tasked with generating a UI component

## Steps

1. **Analyze the input data if given:**
   Review the provided JSON payload, backend endpoint, or data contract to understand the required data structure. If not given, propose the data contract based on what the user wants to implement.

2. **Generate the TypeScript interface:**
   Define explicit types for the expected data prop. The component must be strictly prop-driven. Explain the abstraction to the user, make sure user agrees with the interface. Give 2 other versions, 1 tighter, 1 looser (than the already provided interface)

3. **Draft the Dumb Component:**
   Create a stateless React functional component that only accepts the defined interface as props. 

4. **Apply constraints and styling:**
   - Check the existing filetree for design guides and styling, usually in "docs/" folder

5. **Provide the network integration (Optional):**
   If the user asks how to fetch the data, generate a separate TanStack Query hook and a Smart Container parent to demonstrate how the data pipes into your Dumb Component.

## Rules

- **NO Data Fetching:** Never use `useEffect` or `fetch` inside the UI component. Assume the frontend is merely a cache.
- **NO Complex State:** Use `useState` only for trivial, ephemeral UI state (e.g., `isOpen` for a dropdown).
- **Strict Tech Stack:** Do not suggest or install external libraries, wrappers, or vendor-locked UI-as-a-service tools outside of what's already laid out in the design document.
- **No Custom CSS:** Do not write inline styles (`style={{...}}`) or hallucinate custom hex codes.
- **No Monoliths:** Break distinct visual blocks into smaller, reusable dumb components rather than one massive file.