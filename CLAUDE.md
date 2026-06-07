# CLAUDE.md — Claude Code Session Instructions

Read **PROJECT.md** in full before doing anything else. That document is the single source of truth for this project.

## First session only

1. Install the Superpowers plugin:
   ```
   /plugin install superpowers@claude-plugins-official
   ```
   If `/plugin` is not recognised, run `npm update -g @anthropic-ai/claude-code`, restart, and try again.

2. Confirm the plugin is loaded before proceeding.

3. Run the Superpowers **brainstorming skill** on the project concept as described in PROJECT.md Section 3.

4. Produce `BRAINSTORM.md` and `PLAN.md` and stop for human approval. This is the only approval gate.

## Every session

- Read PROJECT.md before starting work.
- Check DECISIONS.md for context on past autonomous choices.
- Work autonomously per the rules in PROJECT.md Section 2.3.
- Log any non-trivial decisions in DECISIONS.md.
