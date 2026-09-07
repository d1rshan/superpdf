# 05: Results UI — sections + fact browser

**What to build:** The Topic page becomes the knowledge view: Relationships grouped into three expandable sections — Corroborated, Contradicted, Contextualized — each row showing the two Facts side by side with their Qualifiers (time/scope/units), the one-line explanation, confidence, and low-confidence flags. A flat, searchable all-Facts browser (filterable by Document) sits alongside for inspecting extraction quality.

**Blocked by:** 04 (Topic generate → Relationships).

**Status:** ready-for-agent

- [ ] Relationships render in the three sections, expandable, fact-vs-fact with Qualifiers visible
- [ ] Explanation and confidence shown on each Relationship
- [ ] Low-confidence Facts/Relationships visibly flagged
- [ ] All-Facts browser with search and Document filter
- [ ] `lint` and `typecheck` pass; committed in relevant checkpoints with conventional commit messages (multiple commits as work progresses, not one lump commit)
