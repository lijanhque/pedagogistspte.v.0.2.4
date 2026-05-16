'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertCircle, BookOpen, Headphones, Mic } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { PracticeHeader } from '@/components/pte/limits/practice-header';

interface TestUIGuideProps {
  userId: string;
}

/**
 * Visual guide showing how to integrate practice limits into test UIs
 * This component demonstrates best practices for displaying credit/limit information
 */
export function TestUIIntegrationGuide({ userId }: TestUIGuideProps) {
  return (
    <div className="space-y-6 p-4">
      <div>
        <h2 className="text-xl font-bold mb-2">Test UI Integration Guide</h2>
        <p className="text-sm text-muted-foreground">
          Learn how to integrate practice limits and credit checks into your test UIs.
        </p>
      </div>

      <Tabs defaultValue="reading" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="reading">Reading Test</TabsTrigger>
          <TabsTrigger value="listening">Listening Test</TabsTrigger>
          <TabsTrigger value="speaking">Speaking Test</TabsTrigger>
        </TabsList>

        <TabsContent value="reading" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-4 w-4" />
                Reading Test UI Example
              </CardTitle>
              <CardDescription>Add practice limits display at the top</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <PracticeHeader section="reading" userId={userId} />

              <div className="bg-muted p-4 rounded-lg text-sm space-y-2">
                <p className="font-mono text-xs">
                  {`// Add at top of ReadingPracticeClient
import { PracticeHeader } from '@/components/pte/limits/practice-header'

export default function ReadingPracticeClient({...}) {
  return (
    <div>
      <PracticeHeader section="reading" userId={userId} />
      {/* Rest of component */}
    </div>
  )
}`}
                </p>
              </div>

              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  The PracticeHeader automatically checks limits and shows warnings if the user is near their quota.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="listening" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Headphones className="h-4 w-4" />
                Listening Test UI Example
              </CardTitle>
              <CardDescription>Display credits and track attempts</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <PracticeHeader section="listening" userId={userId} />

              <div className="bg-muted p-4 rounded-lg text-sm space-y-2">
                <p className="font-mono text-xs">
                  {`// Use hook to check limits before submit
import { usePracticeLimitChecker } from '@/hooks/usePracticeLimitChecker'

export function ListeningPracticeClient({...}) {
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
    <div>
      <PracticeHeader section="listening" userId={userId} />
      {/* Audio player, options */}
      <button onClick={handleSubmit}>Submit</button>
      {WarningModal && <WarningModal />}
    </div>
  )
}`}
                </p>
              </div>

              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  The usePracticeLimitChecker hook prevents submission and shows a warning modal if limits are reached.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="speaking" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mic className="h-4 w-4" />
                Speaking Test UI Example
              </CardTitle>
              <CardDescription>Gate recording based on available credits</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <PracticeHeader section="speaking" userId={userId} />

              <div className="bg-muted p-4 rounded-lg text-sm space-y-2">
                <p className="font-mono text-xs">
                  {`// Disable recording button if no credits available
import { usePracticeLimitChecker } from '@/hooks/usePracticeLimitChecker'

export function SpeakingPracticeClient({question}) {
  const { checkLimitsBeforeSubmit, warningData } = usePracticeLimitChecker({
    userId,
    section: 'speaking',
    questionType: question.questionType,
  })

  const isButtonDisabled = warningData?.limitType === 'credits' && warningData?.remaining === 0

  return (
    <div>
      <PracticeHeader section="speaking" userId={userId} />
      <button disabled={isButtonDisabled} onClick={startRecording}>
        {isButtonDisabled ? 'No Credits Available' : 'Start Recording'}
      </button>
    </div>
  )
}`}
                </p>
              </div>

              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  For speaking, you may want to disable the record button entirely if AI credits are exhausted.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Card>
        <CardHeader>
          <CardTitle>Integration Checklist</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm">
            <li className="flex items-start gap-2">
              <input type="checkbox" defaultChecked className="mt-1" />
              <span>Add PracticeHeader at the top of each test UI</span>
            </li>
            <li className="flex items-start gap-2">
              <input type="checkbox" defaultChecked className="mt-1" />
              <span>Use usePracticeLimitChecker hook for submit buttons</span>
            </li>
            <li className="flex items-start gap-2">
              <input type="checkbox" defaultChecked className="mt-1" />
              <span>Disable buttons when credits/attempts are exhausted</span>
            </li>
            <li className="flex items-start gap-2">
              <input type="checkbox" defaultChecked className="mt-1" />
              <span>Show upgrade prompts for free users near limits</span>
            </li>
            <li className="flex items-start gap-2">
              <input type="checkbox" defaultChecked className="mt-1" />
              <span>Render warning modals before submission</span>
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
