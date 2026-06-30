# AI Coding Agent Session

This session is a good example of how I used AI coding agents as actual engineering collaborators, not just autocomplete.

The product is **MiqorAI**, a healthcare platform with multiple portals and a shared backend:

- hospital portal
- patient portal
- pharmacy portal
- insurance portal
- admin portal

For this write-up, I am focusing on **one backend feature** that best shows how I worked with Cursor first and then with Codex:

## Feature Spotlight: AI Clinical Safety Gating for Lab Orders and Prescriptions

The problem we were solving was not a simple CRUD problem.

We wanted the backend to act as a real clinical safety layer whenever a doctor tried to:

- order a lab test
- prescribe medication

Instead of blindly creating the order, the system needed to:

1. build a patient-specific clinical context from the database,
2. send that context to the AI service,
3. decide whether the action should proceed,
4. block unsafe actions,
5. preserve the blocked action for later review,
6. let the doctor either override with a reason or cancel,
7. and log the whole decision trail for safety and accountability.

That is a backend workflow problem, not just a frontend modal problem.

## How I Used Cursor

I first used Cursor to understand the shape of the feature across the codebase and reduce the risk of implementing it in the wrong layer.

That work was useful for:

- tracing how prescription and lab-order requests move from the hospital portal into the Node backend,
- understanding how patient allergies, diagnoses, medications, visits, and historical lab results are stored,
- identifying where an AI gate should happen so unsafe orders are blocked **before** persistence,
- mapping where a doctor override should resume the original workflow without forcing the doctor to re-enter everything manually,
- and checking how to preserve doctor-specific safety actions without leaking them to other doctors.

That exploration step mattered because in a product like this, it is easy to put “AI” in the UI and miss the part that actually enforces behavior.

## How I Used Codex

I then used Codex to continue and harden the implementation into a real backend feature.

What we built together is centered around these backend pieces:

- [clinical-safety.service.ts](C:\Users\user\Downloads\github\MiqorAI-git\MiqorAI\server\src\services\clinical-safety.service.ts)
- [ai-clinical-safety.client.ts](C:\Users\user\Downloads\github\MiqorAI-git\MiqorAI\server\src\services\ai-clinical-safety.client.ts)
- [clinical-safety.routes.ts](C:\Users\user\Downloads\github\MiqorAI-git\MiqorAI\server\src\routes\clinical-safety.routes.ts)
- [schema.prisma](C:\Users\user\Downloads\github\MiqorAI-git\MiqorAI\server\prisma\schema.prisma)

## What The Feature Actually Does

When a doctor attempts a prescription or lab order, the backend does **not** immediately create it.

Instead, it builds a structured AI request from live data in the database:

- patient identity and demographics,
- recorded allergies,
- chronic conditions,
- active and historical medications,
- recent visit history,
- prior lab orders and results,
- the doctor’s attempted action,
- and the current complaint or clinical context.

That request-building logic lives in `buildClinicalSafetyRequest()` inside [clinical-safety.service.ts](C:\Users\user\Downloads\github\MiqorAI-git\MiqorAI\server\src\services\clinical-safety.service.ts).

This part is important because the AI is not being asked vague questions. The backend assembles a highly structured payload from normalized application data.

## Why This Was Complex

There were several hard parts:

- The feature needed to work for **two different action types**: lab orders and medication prescriptions.
- It needed to block actions without losing the original payload.
- It needed to be safe when the AI service failed or timed out.
- It needed to support doctor override, but only with a documented reason.
- It needed an audit trail that was detailed enough for compliance review.
- It needed to avoid turning a temporary safety block into a dead-end workflow.

This is why the feature ended up being more like a small backend subsystem than a single endpoint.

## The Main Backend Design

We built the feature around a staged safety workflow.

### 1. The backend creates a clinical-safety request

The service loads and transforms patient data into the AI contract:

- allergies are pulled from `medical_records` where `recordType = "allergy"`,
- diagnoses and chronic conditions are pulled from diagnosis records,
- active medications come from both medication records and prescriptions,
- visit history is reduced into AI-friendly summaries,
- and the attempted doctor action is normalized into a consistent `type + item` shape.

This happens before any risky order is written.

### 2. The backend calls the AI service

The call logic is handled in [ai-clinical-safety.client.ts](C:\Users\user\Downloads\github\MiqorAI-git\MiqorAI\server\src\services\ai-clinical-safety.client.ts).

That client includes several production-minded behaviors:

- a timeout,
- retry behavior for transient upstream failures,
- mock-mode support for testing,
- a local safety response path,
- and a **safe fallback** that blocks the order if the AI service is unavailable.

That last part is especially important. In a clinical-safety workflow, “AI unavailable” should not silently degrade into “go ahead and prescribe anything.”

### 3. Unsafe actions are blocked and saved, not discarded

If the AI says `intervention_required = true`, the backend does not create the order.

Instead, it stores a row in `ai_pending_clinical_actions`.

That pending record contains:

- patient ID,
- doctor ID,
- hospital ID,
- action type,
- action item,
- the current complaint,
- the original request payload,
- and the AI response JSON.

This was a key design choice.

Rather than forcing the frontend to reconstruct the blocked order from scratch, the backend persists the blocked action as a resumable object.

### 4. The doctor can override or cancel later

Once a pending action exists, the doctor gets two backend-supported options:

- `POST /api/v1/clinical-safety/:pendingActionId/override`
- `POST /api/v1/clinical-safety/:pendingActionId/cancel`

Those endpoints are implemented in [clinical-safety.routes.ts](C:\Users\user\Downloads\github\MiqorAI-git\MiqorAI\server\src\routes\clinical-safety.routes.ts).

The override path is not cosmetic.

The backend:

- checks that the pending action belongs to the same doctor,
- validates that it is still pending,
- requires a non-empty override reason,
- replays the original stored order payload,
- creates the actual prescription or lab order only at that point,
- updates the pending action status to `OVERRIDDEN`,
- and records the reason in the audit trail.

The cancel path marks the pending action as `CANCELLED` and ensures no order is created.

## The Audit and Compliance Layer

This was one of the strongest parts of the feature.

We did not treat the AI decision as an invisible implementation detail.

The backend stores a detailed decision trail in `clinical_safety_audit_logs`, including:

- patient,
- doctor,
- hospital,
- attempted action,
- AI alert payload,
- final decision,
- override reason if present,
- and link back to the pending action when relevant.

That means the system can answer questions like:

- What exactly was blocked?
- Why did the AI raise concern?
- Did the doctor override it?
- What reason did they give?
- Was the order ultimately created or cancelled?

This turns the feature from “AI warning popup” into a real accountable clinical workflow.

## How The Feature Protects Users

One detail I liked about this implementation is that it uses multiple safety layers, not just the remote model:

- structured patient context from the real database,
- hard backend gating before persistence,
- safe fallback if the AI service is unavailable,
- mock mode for deterministic testing,
- local allergy-aware logic in the client layer,
- pending-action persistence,
- and auditable override behavior.

That layered design makes the feature more realistic and more robust than a single AI call sitting in isolation.

## Why This Was A Good Use Of AI Coding Agents

This feature is exactly the kind of task where coding agents are most useful when used well.

The challenge was not “write a function.”

The challenge was coordinating:

- Prisma schema design,
- route contracts,
- backend service orchestration,
- persistence strategy,
- AI-service communication,
- fallback behavior,
- and workflow continuation after a block.

Cursor helped with exploration, dependency tracing, and understanding the boundaries of the codebase.

Codex then helped continue the implementation work, validate the code paths, and push the feature into a more complete and production-minded backend workflow.

## Why I’m Proud Of This Session

I think this session shows strong AI-assisted engineering because it demonstrates more than speed.

It shows:

- full-stack reasoning,
- backend architecture decisions,
- safety-aware workflow design,
- persistence and audit thinking,
- and an ability to use AI tools to manage complexity across a real application.

The result was not just a generated code snippet.

It was a clinically meaningful backend feature that:

- understands patient history,
- blocks unsafe actions,
- preserves interrupted work,
- supports safe override,
- and records the decision path end to end.
