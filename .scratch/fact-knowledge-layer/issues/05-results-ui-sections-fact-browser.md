# 05: Results UI — sections + fact browser

**What to build:** The Topic page becomes the knowledge view: Relationships grouped into three expandable sections — Corroborated, Contradicted, Contextualized — each row showing the two Facts side by side with their Qualifiers (time/scope/units), the one-line explanation, confidence, and low-confidence flags. A flat, searchable all-Facts browser (filterable by Document) sits alongside for inspecting extraction quality.

**Blocked by:** 04 (Topic generate → Relationships).

**Status:** done

- [x] Relationships render in the three sections, expandable, fact-vs-fact with Qualifiers visible
- [x] Explanation and confidence shown on each Relationship
- [x] Low-confidence Facts/Relationships visibly flagged
- [x] All-Facts browser with search and Document filter
- [x] `lint` and `typecheck` pass; committed in relevant checkpoints with conventional commit messages (multiple commits as work progresses, not one lump commit)

## Comments

- `isLowConfidence` + threshold moved from `llm.ts` (server-only via `ai` SDK) to `src/lib/confidence.ts` so the client shares one threshold; low-confidence facts and relationships get an amber "low confidence" badge.
- Relationships grouped into native `<details open>` sections keyed by type (`SAME_FACT`→Corroborated, `CONTRADICTS`→Contradicted, `CONTEXTUALIZES`→Contextualized) with counts in the summary; rows show fact-vs-fact cards with Qualifiers, explanation, confidence.
- All-facts browser filters client-side: text search across entity/attribute/value/evidence quote, `<select>` Document filter (names from the topic's selected documents), per-fact source doc + page + confidence. Results API needed no changes — it already returned per-fact confidence, evidence quote, and documentId.
