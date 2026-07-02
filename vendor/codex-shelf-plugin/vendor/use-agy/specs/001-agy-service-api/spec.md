# Feature Specification: AGY Service API

**Feature Branch**: `[001-agy-service-api]`

**Created**: 2026-06-23

**Status**: Draft

**Input**: User description: "Given this is an API that we're putting up, will we also put together some functionality for it as a service? Let a subagent quickly write a spec about that. That and adding a just file to this. Make it the goal to get through all implementation phases, then test and make sure things are fully working and ready according to what we were looking for."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Submit AGY Work Through a Shared Service (Priority: P1)

An agent or local tool submits an AGY task through use-agy and receives a clear result without owning AGY startup or process behavior itself.

**Why this priority**: This is the central value of the feature: callers should be able to rely on one shared AGY capability instead of each caller reinventing AGY execution rules.

**Independent Test**: Can be tested by submitting a representative AGY prompt through the service surface and confirming the caller receives a successful terminal result or a clear failure.

**Acceptance Scenarios**:

1. **Given** the service is ready, **When** a caller submits a valid AGY task with text output requested, **Then** the caller receives text output, completion status, and any diagnostic output.
2. **Given** the service is ready, **When** a caller submits a valid AGY task with structured output requested, **Then** the caller receives valid structured output or a clearly classified structured-output failure.
3. **Given** AGY cannot complete the task, **When** a caller submits work, **Then** the caller receives a clear failure state and caller-actionable diagnostic message.

---

### User Story 2 - Check Service Readiness Before Work (Priority: P1)

An agent or tool checks whether use-agy is ready before submitting work.

**Why this priority**: Agents need a cheap preflight signal so they can avoid hanging, duplicating startup logic, or producing confusing failures.

**Independent Test**: Can be tested by checking readiness in both available and unavailable AGY states and verifying that the status is explicit.

**Acceptance Scenarios**:

1. **Given** AGY is reachable, **When** a caller checks readiness, **Then** the response reports that work can be submitted.
2. **Given** AGY is unavailable, **When** a caller checks readiness, **Then** the response reports that work cannot currently be submitted.

---

### User Story 3 - Use Equivalent Behavior Across Access Paths (Priority: P2)

A human, agent, script, or local tool uses the same AGY behavior from command, service, and programmatic access paths.

**Why this priority**: Multiple access paths are only useful if they describe the same AGY behavior. Divergent behavior would make the toolkit harder for agents to trust.

**Independent Test**: Can be tested by running the same representative task through each supported access path and comparing observable status, output, and error meaning.

**Acceptance Scenarios**:

1. **Given** the same valid task input, **When** it is submitted through each supported access path, **Then** each path exposes equivalent status and result semantics.
2. **Given** the same failing task input, **When** it is submitted through each supported access path, **Then** each path exposes equivalent failure meaning.

---

### User Story 4 - Run Common Repository Workflows (Priority: P3)

A contributor uses named repository workflow commands to validate, generate, and demonstrate use-agy behavior without memorizing the full command set.

**Why this priority**: Reliable repository commands reduce friction for future work and make agent handoffs easier to verify.

**Independent Test**: Can be tested by running the documented workflow commands from a fresh checkout with prerequisites installed.

**Acceptance Scenarios**:

1. **Given** the repository prerequisites are installed, **When** a contributor runs the main validation workflow, **Then** the repository reports whether all checks pass.
2. **Given** generated artifacts may be stale, **When** a contributor runs the generator verification workflow, **Then** the repository reports whether generated outputs are current.

---

### Edge Cases

- AGY is installed but currently unavailable.
- A caller submits malformed or empty task input.
- A caller requests structured output but AGY returns plain text.
- A task succeeds but produces empty output.
- A task fails before useful diagnostic output is available.
- Multiple access paths drift in status, output, or failure meaning.
- A contributor runs repository workflow commands from the wrong directory.
- Repository workflow commands are run before dependencies are installed.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: use-agy MUST expose a local service capability for AGY readiness checks.
- **FR-002**: use-agy MUST expose a local service capability for submitting AGY work.
- **FR-003**: Callers MUST be able to submit AGY work without directly managing AGY startup behavior.
- **FR-004**: Callers MUST be able to request plain text output.
- **FR-005**: Callers MUST be able to request structured output.
- **FR-006**: The service MUST classify structured-output failures separately from AGY execution failures.
- **FR-007**: The service MUST return diagnostic output when AGY provides it.
- **FR-008**: The service MUST report every completed request with an unambiguous terminal state.
- **FR-009**: Command, service, and programmatic access paths MUST expose equivalent readiness, submission, result, and failure semantics.
- **FR-010**: The repository MUST include named workflow commands for installation, validation, tests, typechecking, formatting, generation, and generated-output checks.
- **FR-011**: Documentation intended for agents MUST identify the stable user-facing behavior and distinguish it from internal implementation details.
- **FR-012**: The feature MUST be verifiable by one documented repository validation workflow.

### Key Entities *(include if feature involves data)*

- **Service Readiness Report**: Indicates whether use-agy can currently accept work and includes caller-actionable unavailable information.
- **AGY Work Request**: Represents caller intent, requested output mode, and optional workspace context.
- **AGY Work Result**: Represents terminal status, text or structured output, and diagnostics.
- **Failure Classification**: Describes why a request failed in a way callers can handle consistently.
- **Repository Workflow Command**: A named contributor command for validating or operating the project.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A caller can check readiness and submit a representative AGY task in under 2 minutes using documented repository commands.
- **SC-002**: The same representative task produces equivalent status, output, and failure meaning across every supported access path.
- **SC-003**: 100% of completed requests report one terminal state: succeeded, failed, or unavailable.
- **SC-004**: 100% of structured-output requests return valid structured output or a clearly classified structured-output failure.
- **SC-005**: A contributor can run one documented validation workflow that checks formatting, types, tests, static analysis, and generated-output drift.

## Assumptions

- The service is local to a developer or agent workspace, not a hosted multi-tenant service.
- Existing AGY behavior remains the source of truth; use-agy provides safer and more reusable access to it.
- The first service version may complete work synchronously as long as callers receive an unambiguous terminal state.
- Callers may be humans, agents, scripts, or local tools.
- Repository workflow commands are contributor affordances, not a replacement for the service surface.
