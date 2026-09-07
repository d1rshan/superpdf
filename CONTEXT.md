# superpdf

A fact knowledge layer for PDFs: extracts grounded facts from documents and identifies where they corroborate, contradict, or reconcile through context.

## Language

### Ingestion

**Document**:
A single uploaded PDF. The atomic unit of ingestion and fact provenance.
_Avoid_: file, source

**Chunk**:
A page-grouped slice of a Document's parsed text, the unit fed to fact extraction. Tables are preserved as markdown within a Chunk.
_Avoid_: section, passage

**Fact**:
A structured claim extracted from one Document: an entity, an attribute, a value as stated, and qualifiers. Qualitative facts (e.g. "director resigned") are first-class, same as numeric ones.
_Avoid_: data point, triple

**Qualifier**:
Context that scopes a Fact's value: time period, scope (e.g. standalone vs consolidated), or location. Two Facts differing only in Qualifiers are usually not a contradiction.
_Avoid_: metadata, dimension

**Evidence**:
The verbatim quote plus page number from the Document a Fact was extracted from. Every Fact carries exactly one Evidence.
_Avoid_: citation, source snippet

### Knowledge

**Topic**:
A user-created named selection of Documents that defines the scope of a knowledge run. The knowledge layer is global per Topic, never across Topics.
_Avoid_: session, project, dataset

**Relationship**:
A conclusion that two Facts within a Topic are the same fact, contradictory, or reconcilable through context. Relationships are Topic-scoped and recomputed on regeneration.
_Avoid_: edge, link, comparison

**Corroboration**:
A Relationship stating two differently-expressed Facts refer to the same underlying fact.
_Avoid_: match, duplicate

**Reconciliation**:
A Relationship stating an apparent contradiction between two Facts is explained by a difference in Qualifiers (time, scope, units).
_Avoid_: resolution, contextualization (displayed as "Contextualized" in the UI)

**Regenerate**:
The action of discarding a Topic's Relationships and recomputing them from the Facts of its selected Documents.
_Avoid_: refresh, re-run
