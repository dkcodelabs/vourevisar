# Local Bulk Topics Implementation Plan

> **For agentic workers:** Execute inline in the current workspace and preserve unrelated local changes. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace AI topic splitting in `EditalSubjectsModal` with deterministic local parsing by line break or semicolon and improve keyboard navigation.

**Architecture:** Keep subject matching unchanged. Add a small pure parser in `src/utils`, then let the modal build its existing review model locally. Remove the Edge Function call and AI-only loading state from this flow.

**Tech Stack:** React 18, TypeScript, Vitest, Testing Library conventions.

---

### Task 1: Deterministic topic parser

**Files:**
- Create: `src/utils/bulkTopicParser.ts`
- Create: `src/utils/bulkTopicParser.test.ts`

- [x] Write failing tests for line-break and semicolon separation while preserving commas.
- [x] Implement the minimal local parser.
- [x] Run the focused parser tests.

### Task 2: Keyboard flow and AI removal

**Files:**
- Modify: `src/components/editais/EditalSubjectsModal.tsx`
- Delete: `src/utils/subjectTopicExtraction.ts`
- Delete: `src/utils/subjectTopicExtraction.test.ts`

- [x] Add textarea focus handling for Enter and Tab from the subject field.
- [x] Close subject suggestions or the new-subject message when advancing.
- [x] Replace the Edge Function invocation with local preview generation.
- [x] Remove AI-only labels and loading state from this form.

### Task 3: Verification

- [x] Run focused tests and lint for touched files.
- [x] Run the production build.
- [x] Review the final diff and confirm no Edge Function deployment is required.

### Follow-up: Copy clarity

- [x] Clarify the topic textarea with examples for semicolon-separated topics and one-topic-per-line input.
- [x] Make the new-subject notice clickable so students can confirm it without needing Enter or Tab.
