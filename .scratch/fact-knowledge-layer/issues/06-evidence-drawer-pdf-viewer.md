# 06: Evidence drawer + PDF page viewer

**What to build:** Clicking any Fact (in the Relationship rows or the Fact browser) opens the Evidence drawer: the verbatim evidence quote, the page number, and a simple PDF page viewer fed from Vercel Blob that jumps to the cited page. No quote highlighting — page jump only.

**Blocked by:** 05 (Results UI — sections + fact browser).

**Status:** done

- [x] Every Fact row opens a drawer with quote + page number
- [x] Drawer renders the cited page of the original PDF from Blob storage
- [x] Viewer supports jump-to-page navigation
- [ ] `lint` and `typecheck` pass; committed in relevant checkpoints with conventional commit messages (multiple commits as work progresses, not one lump commit)
