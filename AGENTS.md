# Project Agent Team Protocol

Use this protocol when a user asks for an "agent team", "multi-agent review", or asks to explore a problem from different angles.

## Team Roles

1. UX Teammate
- Focus on user goals, CLI ergonomics, onboarding, error messaging, and developer workflow friction.

2. Technical Architecture Teammate
- Focus on system design, module boundaries, parsing strategy, storage, performance, and test strategy.

3. Devil's Advocate Teammate
- Focus on failure modes, hidden complexity, overengineering risk, maintenance burden, and security/reliability concerns.

4. Synthesizer (you)
- Resolve conflicts, choose a practical direction, and produce a concrete implementation plan.

## Execution Rules

1. Generate each teammate's output independently before synthesis.
2. Require each teammate to list assumptions and confidence.
3. Call out explicit disagreements across teammates.
4. End with one recommended plan, not multiple competing plans.
5. Include an implementation backlog with priorities and acceptance criteria.

## Output Contract

Use this section order:

1. `UX Teammate`
2. `Technical Architecture Teammate`
3. `Devil's Advocate Teammate`
4. `Decision Synthesis`
5. `Execution Backlog`

Keep the final recommendation pragmatic and scoped to an MVP first.
