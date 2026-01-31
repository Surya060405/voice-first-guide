
# Fix Voice Input Issues

## Problem Analysis

### Issue 1: Duplicated Input Text
The speech recognition handler is incorrectly appending final transcripts to interim transcripts, causing text like "show me my last ordershow me my last order".

**Root Cause in `useSpeech.ts` (lines 88-92):**
```
if (finalTranscript) {
  setTranscript(prev => prev + finalTranscript);  // Appends to existing
} else if (interimTranscript) {
  setTranscript(interimTranscript);  // Replaces
}
```

The logic shows:
1. User says "show me my last order"
2. Interim results set transcript to "show me my last order"
3. Final result appends, making it "show me my last ordershow me my last order"

### Issue 2: Input Not Passed to Server
The `handleStopListening` callback in `SupportInterface.tsx` captures a stale `transcript` value due to React closure behavior. When the function is called, it uses the transcript value from when the callback was created, not the current value.

---

## Solution

### Fix 1: Correct Transcript Handling in `useSpeech.ts`

Track interim and final transcripts separately. Only store finalized text in the main transcript, and use a separate ref for the complete accumulated text.

**Changes:**
- Use a ref to track accumulated final transcript
- For interim results, show the accumulated finals + current interim
- For final results, append to the accumulated finals ref
- Reset both on `startListening` and `clearTranscript`

### Fix 2: Fix Stale Closure in `SupportInterface.tsx`

Use a ref to track the latest transcript value, ensuring `handleStopListening` always accesses the current transcript.

**Changes:**
- Add a `transcriptRef` that stays in sync with `transcript`
- Use `transcriptRef.current` in `handleStopListening` instead of the potentially stale `transcript` variable

---

## Technical Implementation

### File: `src/hooks/useSpeech.ts`

```text
Line 36: Add finalTranscriptRef = useRef('')

Lines 75-93: Rewrite onresult handler:
- Build full transcript from event.results (not accumulating)
- Set transcript to full final + current interim
- Store only finals in ref for submission

Line 162: In startListening, reset finalTranscriptRef.current = ''

Line 241: In clearTranscript, reset finalTranscriptRef.current = ''
```

**New onresult logic:**
```
recognition.onresult = (event) => {
  let fullFinal = '';
  let currentInterim = '';

  // Build complete transcript from all results
  for (let i = 0; i < event.results.length; i++) {
    const result = event.results[i];
    if (result.isFinal) {
      fullFinal += result[0].transcript;
    } else {
      currentInterim += result[0].transcript;
    }
  }

  // Store final transcript for submission
  finalTranscriptRef.current = fullFinal;
  
  // Display full final + current interim
  setTranscript(fullFinal + currentInterim);
};
```

### File: `src/components/SupportInterface.tsx`

```text
Line 45: Add transcriptRef = useRef('')

Lines 47-49: Add useEffect to sync transcriptRef with transcript:
  useEffect(() => {
    transcriptRef.current = transcript;
  }, [transcript]);

Lines 92-97: Update handleStopListening to use transcriptRef.current:
  const handleStopListening = useCallback(() => {
    stopListening();
    const currentTranscript = transcriptRef.current;
    if (currentTranscript.trim()) {
      // Submit using the ref value
      handleVoiceSubmit();
    }
  }, [stopListening, handleVoiceSubmit]);
```

---

## Summary of Changes

| File | Change | Purpose |
|------|--------|---------|
| `useSpeech.ts` | Add `finalTranscriptRef` | Track accumulated final transcript separately |
| `useSpeech.ts` | Rewrite `onresult` handler | Build complete transcript from all results, not append |
| `useSpeech.ts` | Reset ref on start/clear | Ensure clean state for each session |
| `SupportInterface.tsx` | Add `transcriptRef` | Avoid stale closure issue |
| `SupportInterface.tsx` | Sync ref with state | Keep ref current |
| `SupportInterface.tsx` | Use ref in `handleStopListening` | Access current transcript value |

---

## Expected Behavior After Fix

1. User clicks mic and says "show me my last order"
2. Transcript shows "show me my last order" (not duplicated)
3. User clicks mic again to stop
4. Message "show me my last order" is sent to server
5. AI response is received and spoken
