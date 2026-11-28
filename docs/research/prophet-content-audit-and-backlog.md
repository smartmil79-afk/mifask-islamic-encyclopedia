# Prophet Content Audit and Editorial Backlog

**Audit date:** 2026-11-28  
**Scope:** Existing local Prophet article records in `lib/content.ts` and the Prophet reference-index page in `app/prophets/page.tsx`.

## Executive finding

The encyclopedia already contains 25 starter Prophet entries. They are useful introductory stubs, but they are not yet full biographies. Most contain only a short summary, two or three brief paragraphs, and Qur'an references. The Prophet index correctly warns that its database entries are a reference index and remain under editorial review.

**Recommendation:** retain the current cautious content, then expand entries in small reviewed batches. Do not replace short entries with long narratives assembled from unverified popular stories.

## What the audit found

- The local article collection contains 25 Prophet entries, including Prophet Muhammad ﷺ.
- Most entries explicitly describe themselves as introductory and say that more detailed sections require verified source notes.
- The current article model supports references and source links, but a source link alone is not evidence that a claim has been checked.
- The Prophet index reads names and Qur'an reference coordinates from `ie_prophets`; it explicitly states that these are not biographies or scholarly approvals.
- Qur'anic references should remain the primary anchor for narrative claims. Hadith and Seerah reports should be added only with identifiable collection/work, book or chapter, hadith/report number where available, and a reliability note appropriate to the source.
- Reports drawn from later historical or exegetical works should be clearly distinguished from Qur'anic statements and authenticated Prophetic reports.
- The existing article summaries should not be treated as sufficient narration scripts for the planned story-audio feature until the expanded text has passed editorial review.

## Recommended editorial structure for each biography

1. **Overview** — identity and the Qur'anic place of the Prophet.
2. **Mission and people** — what the Qur'an establishes about the call and its audience.
3. **Narrative in Qur'anic order** — key events, with verse references beside relevant claims.
4. **Authentic reports** — supplementary narrations with traceable source identifiers and grading where applicable.
5. **What is not established** — popular details that lack reliable evidence or are disputed.
6. **Lessons and reflections** — clearly marked editorial reflections, not presented as direct quotations or revelation.
7. **References and further reading** — primary references first, then carefully selected secondary works.
8. **Audio narration text** — generated only from the reviewed article body, not from unreviewed notes.

## Work priority

### Batch 1 — foundational and narrative-rich accounts

- Adam
- Nuh
- Ibrahim
- Yusuf
- Musa
- Yunus

These provide a strong first set for testing the editorial template because the Qur'an gives substantial narrative material for them.

### Batch 2 — connected family and mission narratives

- Ismail
- Ishaq
- Yaqub
- Harun
- Zakariya
- Yahya
- Isa

Keep family relationships and chronology tied to explicit evidence; avoid filling gaps with assumptions.

### Batch 3 — other named Prophets

- Idris
- Hud
- Salih
- Lut
- Shu'ayb
- Ayyub
- Dhul-Kifl
- Dawud
- Sulayman
- Ilyas
- Al-Yasa

Where the Qur'an gives limited biographical detail, a shorter article is preferable to an artificially expanded story. For Dhul-Kifl and other debated identifications, state the uncertainty rather than asserting a disputed identity.

### Batch 4 — Seerah-focused review

- Muhammad ﷺ

The existing Seerah collection should be treated as the detailed biography track. Avoid duplicating it in the Prophet article; use the Prophet entry as an overview with links to reviewed Seerah chapters.

## Publication gates

An article must not be marked verified or published merely because it has Qur'an reference coordinates or a source URL.

Before approval, editors should confirm:

- Each Qur'an reference matches the claim it is attached to.
- Arabic quotations, if included, match the source text exactly.
- Translations are attributed to the translation provider/translator.
- Hadith citations identify the collection and report precisely; grading is not invented or inferred.
- Historical reports are labeled by source type and reliability.
- Differences in scholarly interpretation are represented fairly and with attribution.
- Reuse permissions are recorded for any third-party text, translation, image, or audio.
- The narration script matches the approved article text.
- Reviewer and review date are recorded.

## Scope intentionally excluded

This audit does not change article copy, database rows, Prophet reference coordinates, publication status, or production configuration. It does not scrape or import content from Kalamullah, Muslim Central, or IslamQA. The external-source catalogue PR remains a separate change and should be reviewed independently.

## Next practical implementation

Start with Batch 1. For each Prophet, prepare a claim-to-reference outline first, then draft original prose from verified primary references, record secondary source notes, and submit the article for editorial review. Only after approval should the article body and audio narration be updated.
