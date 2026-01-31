

# Improve AI Voice Output - US English Male Voice

## Current Implementation

The `speak` function in `src/hooks/useSpeech.ts` currently uses the browser's built-in `SpeechSynthesis` API with a generic voice selection that prioritizes "Google", "Natural", or "Samantha" voices. This doesn't ensure consistency in accent, gender, or pronunciation quality.

---

## Solution

Update the voice selection logic to specifically target US English male voices with clear pronunciation.

---

## Technical Implementation

### File: `src/hooks/useSpeech.ts`

**Update the `speak` function (lines 196-233):**

Replace the current voice selection logic with a prioritized search for US English male voices:

```typescript
const speak = useCallback((text: string) => {
  if (isMuted || !window.speechSynthesis) return;

  // Cancel any ongoing speech
  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  
  // Voice settings for clear, professional tone
  utterance.rate = 0.95;      // Slightly slower for clarity
  utterance.pitch = 0.95;     // Slightly lower for male voice
  utterance.volume = 1;
  utterance.lang = 'en-US';   // Force US English

  // Get available voices
  const voices = window.speechSynthesis.getVoices();
  
  // Filter for US English voices
  const usEnglishVoices = voices.filter(v => 
    v.lang === 'en-US' || v.lang.startsWith('en-US')
  );

  // Priority list for high-quality US English male voices
  const preferredMaleVoiceNames = [
    'Google US English Male',
    'Microsoft David',
    'Microsoft Guy Online',
    'Alex',                    // macOS male voice
    'Daniel',                  // iOS/macOS UK but clear
    'Aaron',                   // macOS
    'Google US English',
    'Microsoft Mark',
    'Fred',                    // macOS fallback
  ];

  // Find the best matching voice
  let selectedVoice = null;

  // First: Try to find a preferred male voice
  for (const name of preferredMaleVoiceNames) {
    selectedVoice = usEnglishVoices.find(v => 
      v.name.includes(name)
    );
    if (selectedVoice) break;
  }

  // Second: Look for any US English voice with 'Male' in name
  if (!selectedVoice) {
    selectedVoice = usEnglishVoices.find(v => 
      v.name.toLowerCase().includes('male')
    );
  }

  // Third: Look for voices that typically sound male (David, James, etc)
  if (!selectedVoice) {
    const maleNames = ['david', 'james', 'mark', 'guy', 'alex', 'aaron', 'fred'];
    selectedVoice = usEnglishVoices.find(v => 
      maleNames.some(name => v.name.toLowerCase().includes(name))
    );
  }

  // Fourth: Fall back to first US English voice
  if (!selectedVoice) {
    selectedVoice = usEnglishVoices[0];
  }

  // Fifth: Ultimate fallback to any English voice
  if (!selectedVoice) {
    selectedVoice = voices.find(v => v.lang.startsWith('en')) || voices[0];
  }

  if (selectedVoice) {
    utterance.voice = selectedVoice;
    console.log('Using voice:', selectedVoice.name, selectedVoice.lang);
  }

  utterance.onstart = () => {
    setVoiceState('speaking');
  };

  utterance.onend = () => {
    setVoiceState('idle');
  };

  utterance.onerror = () => {
    setVoiceState('idle');
  };

  synthesisRef.current = utterance;
  window.speechSynthesis.speak(utterance);
}, [isMuted]);
```

**Add voice initialization on component mount:**

The browser's `getVoices()` may return an empty array initially. Add an effect to ensure voices are loaded:

```typescript
// Add after line 37 (after finalTranscriptRef)
const voicesLoadedRef = useRef(false);

// Add new useEffect after line 47 (after clearErrorAfterDelay)
useEffect(() => {
  // Ensure voices are loaded (some browsers load async)
  const loadVoices = () => {
    const voices = window.speechSynthesis?.getVoices();
    if (voices && voices.length > 0) {
      voicesLoadedRef.current = true;
    }
  };

  loadVoices();
  
  // Chrome loads voices asynchronously
  if (window.speechSynthesis) {
    window.speechSynthesis.onvoiceschanged = loadVoices;
  }

  return () => {
    if (window.speechSynthesis) {
      window.speechSynthesis.onvoiceschanged = null;
    }
  };
}, []);
```

---

## Voice Selection Priority

| Priority | Voice Name | Platform | Notes |
|----------|------------|----------|-------|
| 1 | Google US English Male | Chrome | High quality, clear |
| 2 | Microsoft David | Windows/Edge | Professional, clear |
| 3 | Microsoft Guy Online | Windows/Edge | Natural male voice |
| 4 | Alex | macOS | Default male voice |
| 5 | Microsoft Mark | Windows | Alternative male |
| 6 | Any with "male" in name | Cross-platform | Generic fallback |
| 7 | Any US English | Cross-platform | Accent fallback |
| 8 | Any English | Cross-platform | Ultimate fallback |

---

## Voice Settings Explained

| Setting | Value | Purpose |
|---------|-------|---------|
| `rate` | 0.95 | Slightly slower for better clarity |
| `pitch` | 0.95 | Slightly lower for more masculine tone |
| `volume` | 1 | Full volume |
| `lang` | 'en-US' | Force US English pronunciation |

---

## Expected Behavior After Fix

1. Voice output will consistently use a US English male voice
2. Clear, professional pronunciation
3. Slightly slower pace for better comprehension
4. Graceful fallback if preferred voice isn't available
5. Console logs which voice is selected for debugging

---

## Browser Compatibility Notes

- **Chrome**: Uses Google voices (high quality)
- **Edge**: Uses Microsoft voices (David, Guy Online)
- **Safari/macOS**: Uses Apple voices (Alex, Aaron)
- **Firefox**: Limited voice selection, may use system default

