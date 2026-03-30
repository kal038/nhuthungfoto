---
name: give-steps
description: Generate a clear, step-by-step implementation plan for a given engineering task that is immediately executable by a developer
---

**Trigger conditions:**

- User asks to give "implement steps"
- User provides a task description with constraints
- User shares a user story

**Initial behavior:**
Do NOT ask to co-author. Immediately generate a structured plan.


## Core Output Format

Every response MUST follow this exact structure:

TASK:
<One-sentence description of the goal>

CONSTRAINTS:

<Explicit constraint>
<Libraries/tools required or forbidden>
<Environment assumptions>
<Validation rules>

STEPS:

<Step title>:
<Concrete action>
<Concrete action>
<Step title>:
<Concrete action>
<Concrete action>

...

N. <Final step>:

<Verification step>
<Testing step>

---

## Core Rules

### 1. No Code (Strict)

NEVER include:
- Code
- Pseudocode
- Function implementations

ONLY describe:
- What to build
- Where to build it
- What it should contain

---

### 2. Atomic Steps

Each step must be:
- Small and executable
- Clearly scoped to a file/module/system concern
- Independently verifiable

Avoid vague steps like:
- "Implement upload system"
- "Connect frontend to backend"

---

### 3. File-System Awareness

Always reference:
- Exact file paths
- Whether a file is created or updated

Example:
- "Create backend/src/routes/uploads.ts"
- "Update frontend/src/main.tsx"

---

### 4. Explicit Inputs & Outputs

For every component:
- Define inputs (request body, params)
- Define outputs (response shape)
- Define side effects (API calls, storage)

---

### 5. Constraint Enforcement

Strictly follow all constraints provided by the user.

If a constraint specifies:
- A required library → must be used
- A forbidden library → must be removed

Example:
- If AWS SDK is forbidden → explicitly uninstall it
- If aws4fetch is required → explicitly use it

---

### 6. Backend / Frontend Separation

When applicable:
- Group backend steps together
- Group frontend steps together
- Keep API boundary clean and explicit

---

### 7. Validation & Error Handling

Always include:
- Input validation layer (e.g., Zod)
- Error handling (400, 500)
- Edge constraints (file size, types, limits)

---

### 8. Verification (Mandatory)

Always include a final step for:
- Local testing
- Invalid input testing
- Real environment testing (if applicable)

---

## Standard Step Categories

Most plans should include:

### Setup
- Install/remove dependencies
- Configure environment variables

### Types & Schemas
- Define request/response shapes
- Add validation

### Services
- External integrations (e.g., R2, S3)

### Routes / Controllers
- API endpoints
- Request handling
- Response formatting

### Frontend API Layer
- API client abstraction
- Error handling

### Hooks / State
- Mutation logic
- State tracking

### UI Components
- User interaction
- State transitions

### Integration
- Wiring into application

### Verification
- Testing and validation

---

## Writing Style

- Be direct and procedural
- Do not explain theory unless necessary
- Prefer concrete actions over descriptions
- Avoid filler or generic phrasing
- Never use emojis

---

## Anti-Patterns (Avoid)

- Vague instructions
- Missing file paths
- Skipping validation
- Mixing backend and frontend logic in one step
- Ignoring constraints

---

## Quality Checklist (Before Output)

Ensure:
- No code is present
- All steps are actionable
- File paths are specified
- Constraints are enforced
- Backend/frontend separation is clear
- Validation is included
- Final verification step exists

---

## Goal

Produce implementation plans that a developer can execute immediately by themselves