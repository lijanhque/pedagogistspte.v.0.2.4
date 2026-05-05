# UI Components for Practice Limits & Credits

## Overview

This document describes the new UI components created for displaying and enforcing practice limits and AI credits in reading, listening, and speaking tests.

## Components Created

### 1. PracticeHeader (`components/pte/limits/practice-header.tsx`)

**Purpose**: Display remaining practice attempts and AI credits at the top of test UIs

**Features**:
- Shows daily and monthly practice attempts remaining
- Displays warning when only 1 attempt remains
- Locks test when limit is reached
- Auto-fetches status on mount

**Usage**:
```tsx
import { PracticeHeader } from '@/components/pte/limits/practice-header'

export function ReadingPracticeClient({ userId }) {
  return (
    <>
      <PracticeHeader section="reading" userId={userId} />
      {/* Rest of component */}
    </>
  )
}
```

### 2. TestAccessGate (`components/pte/limits/test-access-gate.tsx`)

**Purpose**: Gate access to tests when user doesn't have credits/attempts

**Features**:
- Shows lock icon and reason message
- Displays upgrade prompt with link to pricing
- Wraps content that should be hidden
- Optional upgrade prompt customization

**Usage**:
```tsx
import { TestAccessGate } from '@/components/pte/limits/test-access-gate'

export function ReadingTest({ canAccess, reason }) {
  return (
    <TestAccessGate testType="reading" canAccess={canAccess} reason={reason}>
      <ReadingPracticeClient />
    </TestAccessGate>
  )
}
```

### 3. PracticeLimitWarningModal (`components/pte/limits/practice-limit-warning-modal.tsx`)

**Purpose**: Show warnings before submission when user is near/at limits

**Features**:
- Different warning types (daily, monthly, credits, mock-test)
- Shows reset time for daily limits
- Disables continue button when limit is reached
- Displays remaining attempts

**Usage**:
```tsx
import { PracticeLimitWarningModal } from '@/components/pte/limits/practice-limit-warning-modal'

const [showWarning, setShowWarning] = useState(false)

<PracticeLimitWarningModal
  open={showWarning}
  onOpenChange={setShowWarning}
  onContinue={handleSubmit}
  limitType="daily"
  remaining={1}
  total={3}
  resetsAt={tomorrow}
/>
```

### 4. PracticeLimitDisplay (`components/pte/limits/practice-limit-display.tsx`)

**Purpose**: Display comprehensive status of all limits (AI credits, practice, mock tests)

**Features**:
- Shows AI credits remaining
- Shows practice questions remaining today/month
- Shows mock test access status
- Two variants: compact and full
- Color-coded by resource type

**Usage**:
```tsx
import { PracticeLimitDisplay } from '@/components/pte/limits/practice-limit-display'

<PracticeLimitDisplay userId={userId} variant="full" showDetails={true} />
```

### 5. Hook: usePracticeLimitChecker (`hooks/usePracticeLimitChecker.ts`)

**Purpose**: Client-side hook for checking limits before submission

**Features**:
- Checks practice limits before allowing submission
- Checks AI credits for speaking/writing
- Shows warning modal if limits are near/at threshold
- Returns warning data and modal component
- Async validation with error handling

**Usage**:
```tsx
import { usePracticeLimitChecker } from '@/hooks/usePracticeLimitChecker'

export function ListeningPracticeClient({ userId, questionType }) {
  const { checkLimitsBeforeSubmit, WarningModal } = usePracticeLimitChecker({
    userId,
    section: 'listening',
    questionType,
  })

  const handleSubmit = async () => {
    await checkLimitsBeforeSubmit(async () => {
      // Proceed with scoring
      await scoreListeningAttempt(...)
    })
  }

  return (
    <>
      <button onClick={handleSubmit}>Submit</button>
      {WarningModal && <WarningModal />}
    </>
  )
}
```

## Integration Points

### Reading Test (`components/pte/reading/ReadingPracticeClient.tsx`)

**Add at top of component**:
```tsx
import { PracticeHeader } from '@/components/pte/limits/practice-header'
import { usePracticeLimitChecker } from '@/hooks/usePracticeLimitChecker'

export function ReadingPracticeClient({ question, userId }) {
  const { checkLimitsBeforeSubmit, WarningModal } = usePracticeLimitChecker({
    userId,
    section: 'reading',
    questionType: question.questionType?.code,
  })

  const handleSubmit = async () => {
    await checkLimitsBeforeSubmit(async () => {
      await scoreReadingAttempt(...)
    })
  }

  return (
    <>
      <PracticeHeader section="reading" userId={userId} />
      {/* Existing UI */}
      <button onClick={handleSubmit}>Submit</button>
      {WarningModal && <WarningModal />}
    </>
  )
}
```

### Listening Test (`components/pte/listening/ListeningPracticeClient.tsx`)

**Same pattern as Reading**

### Speaking Test (`components/pte/speaking/speaking-client.tsx`)

**Add gate for recording**:
```tsx
import { usePracticeLimitChecker } from '@/hooks/usePracticeLimitChecker'

export function SpeakingPracticeClient({ question, userId }) {
  const { checkLimitsBeforeSubmit, warningData, WarningModal } = usePracticeLimitChecker({...})

  const recordingDisabled = warningData?.limitType === 'credits' && warningData?.remaining === 0

  return (
    <>
      <PracticeHeader section="speaking" userId={userId} />
      <button disabled={recordingDisabled} onClick={startRecording}>
        {recordingDisabled ? 'No Credits' : 'Start Recording'}
      </button>
      {WarningModal && <WarningModal />}
    </>
  )
}
```

## Server-Side Integration

The UI components interact with these server functions:

1. **`lib/subscription/practice-limits.ts`**
   - `getPracticeLimitStatus()` - Get remaining practice attempts
   - `canStartPracticeQuestion()` - Check if user can start a question
   - `incrementPracticeQuestionCount()` - Increment after successful attempt

2. **`lib/subscription/credits.ts`**
   - `getCreditStatus()` - Get remaining AI credits
   - `canUseAiScoring()` - Check if AI credits available
   - `deductAiCredit()` - Deduct after scoring

3. **`lib/subscription/mock-test-access.ts`**
   - `getMockTestAccessStatus()` - Check mock test usage
   - `canStartMockTest()` - Gate mock test start

4. **`app/api/pte/score/route.ts`**
   - Validates practice limits before scoring
   - Deducts AI credits after scoring
   - Returns error if limits exceeded

## Testing

All UI components have been verified to:
- ✅ Compile without errors
- ✅ Integrate with existing subscription logic
- ✅ Display correct status information
- ✅ Handle edge cases (0 credits, 0 attempts, etc.)

## User Experience

### Free User Workflow
1. User attempts reading question
2. PracticeHeader shows: "2 remaining today" (free tier limit is 3)
3. User submits
4. Warning modal shows: "This is your last attempt today"
5. User confirms and submits
6. Question is scored, practice count incremented
7. Header now shows: "0 remaining today"
8. Submit button is disabled
9. Link to upgrade appears

### Pro User Workflow
1. User attempts speaking question
2. PracticeHeader shows: "Unlimited" (pro tier has unlimited)
3. User records and submits
4. Question is scored
5. No warnings or restrictions

## Future Enhancements

- [ ] Add animations for limit transitions
- [ ] Show progress bars for monthly limits
- [ ] Add streak tracking UI
- [ ] Implement credit purchase flow in UI
- [ ] Add historical usage charts
- [ ] Real-time sync of limit changes across tabs
