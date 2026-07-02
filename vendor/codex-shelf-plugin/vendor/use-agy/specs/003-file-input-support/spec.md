# Feature Specification: File Input Support

**Feature Branch**: `003-file-input-support`

**Created**: 2026-06-23

**Status**: Draft

**Input**: User description: "use-agy file support thingie; make agy-review and Telegram notifier able to route large prompts and artifacts through use-agy instead of fragile giant CLI arguments."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Review Large Artifacts Safely (Priority: P1)

An agent reviewing a document, diff, transcript, or generated artifact can hand the content to use-agy as a file and receive the same kind of model response as inline input without hitting command-size limits.

**Why this priority**: This removes the current failure mode where useful reviews become unreliable once the prompt is too large for a single command argument.

**Independent Test**: Can be fully tested by asking use-agy to review a large local text file and confirming the response is based on the file contents.

**Acceptance Scenarios**:

1. **Given** a readable local text file larger than typical shell argument limits, **When** an agent submits it for review, **Then** use-agy completes the request and returns the model response.
2. **Given** a readable local file and a short instruction, **When** both are submitted together, **Then** the model receives both the instruction and the file content context.
3. **Given** a missing or unreadable file, **When** an agent submits it, **Then** use-agy reports a clear error without invoking the model.

---

### User Story 2 - Preserve Existing Inline Workflows (Priority: P2)

An agent that already uses use-agy with small inline text continues to work unchanged while gaining an obvious path for file-backed requests.

**Why this priority**: Existing skills and integrations should not need disruptive rewrites just to gain file support.

**Independent Test**: Can be fully tested by running an existing small inline request and a new file-backed request in the same environment.

**Acceptance Scenarios**:

1. **Given** a small inline prompt, **When** an agent submits it, **Then** use-agy returns the same response style as before.
2. **Given** a file-backed prompt, **When** an agent submits it, **Then** the output uses the same success and error conventions as inline mode.

---

### User Story 3 - Support Automation Pipelines (Priority: P3)

An automation such as a notifier, review script, or skill can decide whether to send inline text or file-backed input based on content size, while operators get predictable diagnostics either way.

**Why this priority**: Telegram notifier and agy-review both need a shared, boring path for large content, but this should also benefit future CLI integrations.

**Independent Test**: Can be fully tested by simulating a small artifact and a large artifact through the same automation entrypoint and checking that both complete with clear logs.

**Acceptance Scenarios**:

1. **Given** automation output below the configured inline threshold, **When** it calls use-agy, **Then** the request succeeds without requiring a temporary artifact.
2. **Given** automation output above the configured inline threshold, **When** it calls use-agy, **Then** the request succeeds through file-backed input and cleanup responsibility is clear to the caller.
3. **Given** the model returns no usable response, **When** the automation reports failure, **Then** the error identifies whether input loading or model execution failed.

### Edge Cases

- The file path contains spaces or shell-sensitive characters.
- The file is empty.
- The file is extremely large and should be rejected or bounded before model invocation.
- The file is binary or not valid text.
- The file disappears between validation and execution.
- The caller supplies both inline text and a file.
- The caller submits multiple files or a directory when only one file is expected.
- The caller runs from a different working directory than the file path assumes.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Users MUST be able to submit a readable text file as the primary input for a use-agy request.
- **FR-002**: Users MUST be able to combine file content with a short instruction or context statement.
- **FR-003**: The system MUST preserve the current inline text workflow for small requests.
- **FR-004**: The system MUST clearly reject missing, unreadable, empty, binary, or oversized file input before model execution.
- **FR-005**: Error messages MUST distinguish input loading failures from model execution failures.
- **FR-006**: The system MUST document how skills and automation should choose between inline and file-backed input.
- **FR-007**: File-backed requests MUST produce output using the same human-readable and machine-readable conventions as inline requests.
- **FR-008**: The system MUST avoid exposing unrelated workspace files when a caller asks to review one specific file.
- **FR-009**: The system MUST handle file paths with spaces and shell-sensitive characters.
- **FR-010**: The system MUST provide enough diagnostics for an agent to tell the user what file was reviewed and why a request failed.

### Key Entities

- **Input Source**: The content origin for a model request; either inline text or a file path.
- **Review Artifact**: The document, diff, transcript, or generated content being handed to the model.
- **Execution Context**: The working directory and scope available while the model request runs.
- **Diagnostic Result**: The success output or structured failure message returned to the caller.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Agents can successfully submit a text artifact at least 1 MB in size without using a single shell argument for the artifact content.
- **SC-002**: 100% of invalid file-input cases in the acceptance scenarios fail before model execution with a clear user-facing message.
- **SC-003**: Existing inline use-agy calls continue to pass their current tests unchanged.
- **SC-004**: agy-review can review a large local artifact through use-agy without hitting command argument limits.
- **SC-005**: Telegram notifier can hand large completion summaries to use-agy without truncation or command-size failures.

## Assumptions

- The first version targets local text files and generated temporary text artifacts, not remote URLs.
- Directory-wide review belongs to a separate workspace/repo review flow.
- Binary attachment extraction is out of scope for this feature.
- Callers remain responsible for deciding whether the content is appropriate to send to the configured model.
- File-input support should be documented for both skill authors and automation code paths.
