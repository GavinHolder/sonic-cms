# Hierarchical Task Management Protocol (Non-Negotiable)

**Version:** 3.0
**Created:** 2026-03-05 11:14:52 UTC
**Max Depth:** 5 levels

---

## Golden Rule

**NOTHING gets done without tasks.** Before writing any code, making any change, or starting any work, create a task list first. Every task must be tracked from start to completion. This is mandatory, not a suggestion.

---

## Numbering System

### Level 1-5 Hierarchy
```
1. Main Task (Level 1)
   1.1 Subtask (Level 2)
       1.1.1 Sub-subtask (Level 3)
             1.1.1.1 Detail task (Level 4)
                     1.1.1.1.1 Granular task (Level 5 - maximum)
```

**Max depth = 5.** If you need 6 levels, the task is too complex - break into multiple Level 1 tasks.

---

## Debug Tasks (Fixing Bugs Mid-Step)

When something breaks while working on a step, create a **debug task** as a child. Do NOT abandon the parent task. Do NOT skip to the next step. Fix the issue in place, then resume.

```
1. Build user dashboard
   1.1 Create layout component [IN PROGRESS]
   1.1.debug.a: CSS grid not rendering correctly
       1.1.debug.a.1 Investigate - check browser output
       1.1.debug.a.2 Fix - missing display:grid on container
       1.1.debug.a.3 Verify fix
   1.1 [RESUMED] Continue layout component
   1.2 Add data widgets (NEXT - untouched, stays in queue)
```

**Critical:** The remaining steps (1.2, 1.3, etc.) do NOT move or change when a debug task is created. They stay exactly where they are.

---

## Amendment Tasks (Revising a Completed Step)

When a completed step needs changes (user feedback, missed requirement, discovered issue), create an **amendment task**. Do NOT re-do the entire step or shuffle the remaining plan.

```
1. Build API endpoints
   1.1 Create GET /users [COMPLETE]
   1.2 Create POST /users [COMPLETE]
   1.2.amend.a: Add email validation to POST /users
       1.2.amend.a.1 Add validation logic
       1.2.amend.a.2 Update tests
       1.2.amend.a.3 Verify
   1.3 Create DELETE /users (NEXT - still in queue)
```

---

## Deviation Handling (Unexpected Discoveries)

When broader issues are discovered mid-task (not bugs in the current step):

```
1. Main Task
   1.1 Subtask [IN PROGRESS]
   DEVIATION 1.1.a: Discovered auth middleware is missing
       1.1.a.1 Investigate scope
       1.1.a.2 Fix implementation
       1.1.a.3 Verify fix with tests
   1.2 Continue original plan (unchanged)
```

**Multiple deviations:** a, b, c, d, e (max 5 per level)
**Nested deviations:** alpha, beta, gamma, delta, epsilon

---

## Checkpoint System

### Automatic Checkpoints (Every 5 Tasks)

```
1. Task 1
2. Task 2
3. Task 3
4. Task 4
5. Task 5
6. CHECKPOINT: Review progress, update memory files
7. Task 6
...
12. CHECKPOINT: Review progress, update memory files
```

### Checkpoint Actions

1. Update SESSION_CHANGELOG.md with completed tasks + timestamps
2. Update SESSION_CONTEXT.md with current state
3. Run continuous learning (extract patterns)
4. Report summary to user:
   ```
   CHECKPOINT (Tasks 1-5 complete)
   - N tasks completed
   - N tasks remaining
   - Memory files updated
   - Next: Task N - [Name]
   ```

### Manual Checkpoints

User says "checkpoint" at any time to trigger checkpoint actions.

---

## Task Status Indicators

```
[ ] NOT STARTED
[>] IN PROGRESS
[x] COMPLETE
[D] DEBUG - fixing a bug in current step
[A] AMENDMENT - revising a completed step
[!] DEVIATION - unexpected issue discovered
[-] BLOCKED - waiting on dependency
[X] FAILED - requires replanning
[#] CHECKPOINT
```

---

## When to Create Subtasks

**Always create subtasks when:**
- Main task has >1 distinct step
- Task touches >1 file
- Task is Level 2+ (any non-trivial work)

**Keep flat only when:**
- Task is genuinely single-step (rename a variable, fix a typo)

---

## Depth Guidelines

| Depth | Use Case | Example |
|-------|----------|---------|
| Level 1 | Major features, phases | 1. Build user auth system |
| Level 2 | Feature components | 1.1 Create login form |
| Level 3 | Implementation steps | 1.1.1 Add form validation |
| Level 4 | Detailed actions | 1.1.1.1 Write Zod schema |
| Level 5 | Granular fixes (rare) | 1.1.1.1.1 Handle edge case |

---

**This protocol is mandatory for all sessions. No exceptions.**
