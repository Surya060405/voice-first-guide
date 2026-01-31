

# Fix Network Error in Voice Agent (Deployed)

## Root Cause Analysis

The "network error" in the Web Speech API is a fundamental limitation of how Chrome implements speech recognition:

1. **Server-side processing**: Chrome's Web Speech API sends audio to Google's speech recognition servers. As noted in MDN documentation: "On some browsers, like Chrome, using Speech Recognition on a web page involves a server-based recognition engine. Your audio is sent to a web service for recognition processing."

2. **Network dependency**: The error occurs when the connection to Google's speech servers is interrupted or blocked. This can happen due to:
   - Temporary network instability
   - Firewall/corporate network restrictions
   - VPN interference
   - Browser privacy extensions blocking Google services
   - Rate limiting from Google's servers

3. **Current implementation handles it as a soft error**: The code correctly treats network errors as temporary, but could be more resilient with automatic retry logic.

---

## Solution: Add Retry Logic with Exponential Backoff

Instead of requiring users to manually tap the mic again after a network error, implement automatic retry logic that:
- Automatically retries on network errors (up to 3 attempts)
- Uses exponential backoff between retries
- Only shows the error message if all retries fail
- Improves user experience significantly

---

## Technical Implementation

### File: `src/hooks/useSpeech.ts`

**Add retry state and refs:**
```text
Line 37: Add retryCountRef = useRef(0)
Line 38: Add retryTimeoutRef = useRef<NodeJS.Timeout | null>(null)
Line 39: Add MAX_RETRIES = 3
```

**Update network error handling in onerror (lines 110-117):**
```text
Replace current network error case with:
- Check if retryCountRef.current < MAX_RETRIES
- If yes: increment retry count, set timeout with exponential backoff (1s, 2s, 4s)
- In timeout: nullify recognitionRef.current, call startListening() to retry
- If no: show error message, reset retry count, set voiceState to idle

This turns:
case 'network':
  setErrorMessage('Network error. Tap mic to try again.');
  clearErrorAfterDelay();
  isListeningRef.current = false;
  setVoiceState('idle');
  recognitionRef.current = null;
  break;

Into:
case 'network':
  if (retryCountRef.current < MAX_RETRIES) {
    retryCountRef.current++;
    const delay = Math.pow(2, retryCountRef.current - 1) * 1000;
    console.log(`Network error, retrying in ${delay}ms (attempt ${retryCountRef.current}/${MAX_RETRIES})`);
    retryTimeoutRef.current = setTimeout(() => {
      recognitionRef.current = null;
      startListening();
    }, delay);
  } else {
    setErrorMessage('Network error. Please check your connection and try again.');
    clearErrorAfterDelay(5000);
    retryCountRef.current = 0;
    isListeningRef.current = false;
    setVoiceState('idle');
    recognitionRef.current = null;
  }
  break;
```

**Reset retry count on successful start (line 167):**
```text
After setVoiceState('listening'):
retryCountRef.current = 0;
```

**Clear retry timeout in stopListening (lines 184-194):**
```text
Add at beginning of stopListening:
if (retryTimeoutRef.current) {
  clearTimeout(retryTimeoutRef.current);
  retryTimeoutRef.current = null;
}
retryCountRef.current = 0;
```

**Clear retry timeout in cleanup effect (lines 252-266):**
```text
Add to cleanup:
if (retryTimeoutRef.current) {
  clearTimeout(retryTimeoutRef.current);
}
```

---

## Summary of Changes

| Location | Change | Purpose |
|----------|--------|---------|
| `useSpeech.ts` lines 37-39 | Add retry refs and constant | Track retry attempts |
| `useSpeech.ts` network case | Add auto-retry with backoff | Automatically recover from network errors |
| `useSpeech.ts` startListening | Reset retry count on success | Clear retries after successful start |
| `useSpeech.ts` stopListening | Clear retry timeout | Prevent retries after manual stop |
| `useSpeech.ts` cleanup | Clear retry timeout | Cleanup on unmount |

---

## Expected Behavior After Fix

1. User clicks mic, recognition starts
2. If network error occurs:
   - First attempt: Wait 1 second, retry automatically
   - Second attempt: Wait 2 seconds, retry automatically  
   - Third attempt: Wait 4 seconds, retry automatically
3. If all 3 retries fail: Show error message "Network error. Please check your connection and try again."
4. User can still click mic to try again manually
5. If user clicks stop during retry: Retries are cancelled

---

## Additional Recommendations

If network errors persist even with retries, users should:
1. **Check network connection**: Ensure stable internet access
2. **Disable VPN**: Some VPNs block Google services
3. **Check browser extensions**: Privacy extensions may block Google's speech servers
4. **Try a different browser**: Safari uses on-device processing and doesn't have this issue
5. **Use text input**: The chat interface works as a reliable fallback

