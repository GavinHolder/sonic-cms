# Learned Patterns - white-label-cms

**Created:** 2026-03-05 11:14:52 UTC

## How Learning Works

Learnings are stored as **individual files** in each skill's `learned/` folder:
```
~/.claude/skills/<skill-name>/learned/<topic>.md
```

- One topic per file, max 30 lines, kebab-case filenames
- Only extract non-obvious, reusable, verified knowledge
- See the `continuous-learning` skill for the full workflow and file format

## Project-Specific Learnings

For knowledge specific to THIS project (not a particular skill), add files to:
```
.claude/memory/learned/<topic>.md
```

## User Preferences
- **Communication:** Concise, no fluff, no summaries unless asked
- **UI aesthetic:** Distinctive, avoids generic AI slop
- **Deployment:** Docker + Portainer + Traefik
- **Workflow:** Tasks -> Plan -> Build -> Verify -> Learn
