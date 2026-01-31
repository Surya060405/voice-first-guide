

# Fix Voice Input Issues

## Problem Analysis

The microphone is disappearing after one attempt due to several interconnected issues in the speech recognition implementation:

1. **Permanent error states** - When errors occur, the system sets `isMicAvailable = false` or sets error messages that hide the mic button permanently
2. **No auto-restart on recognition end** - Recognition stops after one phrase and doesn't continue
3. **Gesture context lost** - Creating new recognition objects in retries breaks the user gesture requirement
4. **State not resetting** - Error states persist even after the user might want to try again

---

## Solution

### 1. Rewrite useSpeech Hook

**Key changes:**
- Initialize recognition once and reuse it (preserve gesture context)
- Use `continuous = true` for ongoing listening
- Add `isListeningRef` flag to control auto-restart behavior on `onend`
- Never permanently disable mic availability unless truly unsupported
- Clear error states when user starts new listening session
- Separate "soft" errors (no-speech, network) from "hard" errors (not-allowed)

### 2. Update SupportInterface Component

**Key changes:**
- Remove condition that hides mic based on error message content
- Always show the mic button if the browser supports speech recognition
- Show errors as temporary notifications, not permanent blockers
- Add a "retry" mechanism that clears errors on new attempt

### 3. Fix Error Handling Logic

**Error Categories:**
- **Hard errors** (mic truly unavailable): `not-allowed` after user denies permission
- **Soft errors** (temporary, allow retry): `network`, `no-speech`, `audio-capture`, `aborted`

---

## Technical Implementation

### File: `src/hooks/useSpeech.ts`

```text
Changes:
- Line 23: Initialize isMicAvailable based only on browser support, not permission
- Line 28-30: Add isListeningRef to track user intent
- Line 34-52: Remove permission check on mount (let it fail gracefully on use)
- Line 54-170: Rewrite startListening:
  - Set continuous = true
  - Use isListeningRef to control behavior
  - Clear errors on start
  - Handle onend to auto-restart if still intending to listen
- Line 103-151: Soften error handling:
  - network/no-speech: Show message but don't disable mic
  - not-allowed: Only case that sets isMicAvailable = false
  - All errors: Clear after 3 seconds
```

### File: `src/components/SupportInterface.tsx`

```text
Changes:
- Line 207-218: Always show VoiceButton if browser supports it
- Line 220-226: Show error banner as dismissible notification
- Remove logic that permanently hides mic based on error content
```

---

## Summary of Behavior After Fix

1. User clicks mic button - recognition starts
2. If speech detected - transcript updates in real-time
3. If silence/no-speech - shows temporary message, mic stays visible
4. If network error - shows temporary message, mic stays visible
5. User can always click mic again to retry
6. Mic only disappears if user explicitly denies permission in browser

