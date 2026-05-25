---
name: ui-implementer
description: Use when prompted to generate modern React components. Enforces a strict data/UI boundary via headless hooks, eliminates pass-through containers, and produces cohesive, colocated components.
---
## When to Use
- Whenever tasked with generating anything UI based on some spec.
- Developer provides a JSON payload, TypeScript interface, or route spec and asks for a UI component to visualize it.
- Task involves creating a new screen, form, table, or dashboard element.
## Steps
1. **Analyze & Define the Data Contract:**
   Review the provided JSON payload, backend endpoint, or route spec. Define a precise TypeScript interface for the data the component needs. Do not waste output generating hypothetical alternative interfaces.
   CRITICAL: Output ONLY the TypeScript interface and nothing else. Ask the user, "Does this interface look correct?" Do NOT proceed to write the component or the hook until the user explicitly approves this interface and gives the signal to continue.
2. **Decide the Architecture — Hook vs. Inline (SEMANTIC BOUNDARY):**
   Classify the state based on its domain responsibility to determine if extraction is necessary:
   - **Trivial/Visual State (STAYS INLINE):** State that exists strictly to power the DOM behavior (e.g., `isOpen`, `activeTab`, `isHovered`, or simple controlled inputs) MUST remain inline using `useState`. Do not extract purely visual or ephemeral state.
   - **Pass-Through Data (STAYS INLINE):** If the component simply calls a single data-fetching hook (like `useQuery`) and maps the result directly to the UI without mutation, keep it inline.
   - **Domain Logic (NEEDS A HOOK):** You MUST extract logic into a custom Headless Hook if the component manages business logic. This includes: orchestrating multiple data sources, handling complex derived state, managing multi-field data validation, or executing complex server mutations. Treat the custom hook as a Controller and the React component as a pure View.
3. **Draft the Implementation:**
   Generate the component. The component calls the hook(s) directly and renders the DOM. Sub-components receive only the minimal props they need — not the entire hook result funnelled through a pass-through parent.
4. **Apply constraints and styling:**
   Check the existing filetree for design guides and styling (usually in the "docs/" folder).
## Rules
- **The Hook IS the Data Boundary:** All fetching, mutation, and stateful logic lives in custom hooks (`useQuery`, `useMutation`, or hand-rolled). The component only calls hooks and renders. This is your boundary — you do NOT need a separate Container component to enforce it.
- **No Pass-Through Containers:** NEVER create a "Smart Container" component whose sole job is to destructure a hook result into props for a "Dumb Presenter." If the hook's return values reach the UI without transformation, call the hook directly inside the component. 
- **Sub-Components Get Minimal Props:** When breaking a component into sub-components (e.g., a DropZone inside an UploadPanel), pass only what that sub-component needs — not the entire parent state bag. Use the hook's returns directly in the parent and carve out narrow interfaces for children.
- **NO Data Fetching in Render Functions:** Never use useEffect or raw fetch directly inside a component for data fetching. Use TanStack Query (useQuery/useMutation) either inline or inside your hook.
- **Strict Tech Stack:** Do not suggest or install external libraries, wrappers, or vendor-locked UI-as-a-service tools outside of what's already in the project's dependencies.
- **No Custom CSS:** Do not write inline styles (style={{...}}) or hallucinate custom hex codes. Stick to the project's design system and utility classes.
- **Cohesive Files:** Write the UI component as a single cohesive file. Do NOT prematurely break distinct visual blocks into smaller sub-components unless they are reused across multiple parents or are genuinely complex enough to warrant isolation.