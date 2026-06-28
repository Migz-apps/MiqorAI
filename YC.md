# AI Coding Agent Session

I used AI coding agents as a pair-programming layer while building and refining **MiqorAI**, a multi-portal healthcare platform with separate hospital, pharmacy, patient, insurance, and admin experiences.

What I’m proud of is not just that I used agents to write code faster, but that I used them to coordinate changes across a fairly large, stateful codebase with real product constraints: role-based access, patient privacy, visit continuity, prescription workflows, lab history, QR-based operations, and document/report generation.

## What I did with Cursor

I first used Cursor to explore and plan cross-cutting product work across the codebase. The biggest focus areas were:

- Strengthening the **doctor workflow** so unfinished patient visits could be resumed later without losing clinical context.
- Making sure **prescription history and visit state were doctor-specific**, so one doctor would not see or inherit another doctor’s in-progress work even within the same hospital.
- Extending **seeded patient history data** so the AI layer had meaningful prior tests and medical context across multiple patients, not just a single demo patient.
- Mapping how patient, hospital, and pharmacy flows connected so features could be changed safely across portals rather than patching one screen at a time.

That phase was especially useful for codebase orientation, dependency tracing, and understanding how the same clinical action appeared differently in the hospital portal, pharmacy portal, backend routes, and seeded data.

## What I did with Codex

I then continued the implementation work in Codex and shipped a series of product improvements across the stack:

- Improved the **doctor visit continuity flow** so unfinished visits and saved drafts could be resumed with prior inputs still present, including prescriptions and visit details.
- Tightened **doctor-specific visibility rules** so clinicians only see their own prescriptions and unfinished visit work, preserving privacy and reducing cross-doctor leakage.
- Updated the **patient portal login experience** to remove exposed sample patient details and replace them with safe format-only examples.
- Fixed **report generation and download flows** so report actions in the UI result in actual downloadable files rather than only status notifications.
- Cleaned up **role-based portal access**, including removing check-in from the doctor sidebar and restricting QR-scanning actions to the appropriate portal and role.
- Improved the **QR/camera workflow** so camera-based scanning works more reliably while preserving fallback simulation behavior for testing.
- Expanded the **prescription builder UX** by adding usable medication-strength options and then polishing the styling so the controls looked intentional and production-ready.
- Adjusted the **pharmacy/prescription workflow** to support deeper end-to-end testing when operational constraints were getting in the way, while keeping the broader architecture intact.

## Why this session stands out

This was a good example of using AI tools the way I think they are most valuable: not as autocomplete, but as collaborators for navigating complexity.

The hard part was not generating isolated code snippets. The hard part was keeping a coherent mental model across:

- multiple frontends,
- a shared backend,
- seeded/demo data,
- permission boundaries,
- healthcare-specific workflow rules,
- and interactions where one feature change in one portal could silently break another.

The agents helped me move faster, but the real leverage came from using them to:

- inspect and reason across the whole repo,
- trace behavior from UI to API to persistence,
- implement changes in the right layer instead of the nearest layer,
- and keep product behavior aligned with privacy and workflow requirements.

## Outcome

By the end of the session, I had used AI coding agents to help turn MiqorAI into a more realistic clinical product:

- better longitudinal patient history for AI-assisted decisions,
- safer prescribing behavior,
- stronger draft/resume visit workflows,
- better role isolation,
- more reliable QR and report behavior,
- and a more polished clinician experience.

That combination of **full-stack debugging, workflow design, privacy-aware product thinking, and cross-portal implementation** is the kind of AI-assisted engineering work I’m most proud of.