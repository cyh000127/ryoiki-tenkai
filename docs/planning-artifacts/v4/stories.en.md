# v4 Stories

Status values:

- `done`: implemented on the current branch.
- `planned`: implementable but not started.
- `blocked`: must not be implemented until a prerequisite is resolved.
- `deferred`: intentionally left outside v4.

## V4-E1: Japanese Voice Startup Command

### V4-E1-ST01: Japanese Voice Command Matching Model

- Status: done
- Scope: `ja-JP` speech recognition wrapper, default command list, transcript normalization, keyword containment matching.
- Acceptance criteria: a sentence such as `術式を起動して` matches because it contains `起動して`.
- Dependencies: browser speech recognition support.
- Verification: frontend unit test.

### V4-E1-ST02: Home-Screen Startup Panel

- Status: done
- Scope: microphone button, recognition status, transcript, matched command, failed/unsupported states, manual startup button.
- Acceptance criteria: a user can run both voice startup and manual fallback from the home screen.
- Dependencies: V4-E1-ST01 and the existing guest/loadout/queue flow.
- Verification: workspace UI regression test.

### V4-E1-ST03: Reuse Existing Entry Flow on Success

- Status: done
- Scope: create a guest when there is no session, open loadout when loadout is missing, and start matchmaking when ready.
- Acceptance criteria: voice commands reuse existing action handlers without adding a backend route or skill action.
- Dependencies: player profile query and loadout configured flag.
- Verification: workspace UI regression test.

## V4-E2: Command Customization Readiness

### V4-E2-ST01: Separate Command Source

- Status: done
- Scope: keep the command set and matching function in a feature model outside the UI component.
- Acceptance criteria: adding a command only requires changing the command array.
- Dependencies: V4-E1-ST01.
- Verification: module import and unit test.

### V4-E2-ST02: User-Defined Commands

- Status: deferred
- Scope: account-level command storage, edit UI, and conflict handling.
- Acceptance criteria: a user can register and activate custom phrases.
- Dependencies: settings storage policy and privacy retention rules.
- Verification: future settings test.

## V4-E3: Voice Startup Release Evidence

### V4-E3-ST01: Write v4 Planning Documents

- Status: done
- Scope: write technology stack, epics, stories, implementation order, and prerequisites in Korean and English.
- Acceptance criteria: v4 documents are reachable from the README.
- Dependencies: review of the user proposal.
- Verification: documentation link review.

### V4-E3-ST02: Write Implementation Record

- Status: done
- Scope: record implementation decisions, completed scope, excluded scope, and verification results in Korean and English.
- Acceptance criteria: completion and fallback criteria are documented.
- Dependencies: V4-E1 implementation.
- Verification: implementation artifact review.
