import { AcademicPracticeHeader } from '@/components/pte/practice-header'
import QuestionListTable from '@/components/pte/practice/QuestionListTable'
import { db } from '@/lib/db/drizzle'
import { pteQuestions } from '@/lib/db/schema/pte-questions'
import { eq } from 'drizzle-orm'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Mic, Sparkles } from 'lucide-react'

export const dynamic = 'force-dynamic'

async function getSpeakingQuestions() {
  const questions = await db.query.pteQuestions.findMany({
    where: eq(pteQuestions.isActive, true),
    with: {
      questionType: true,
      speaking: true,
    },
    limit: 20,
  })

  return questions.filter(
    (question) => question.questionType?.code?.startsWith('speaking') && question.speaking
  )
}

export default async function SpeakingPracticePage() {
  const questions = await getSpeakingQuestions()

  return (
    <div className="bg-background min-h-screen">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <AcademicPracticeHeader section="speaking" showFilters={false} />

        <div className="mt-8 grid gap-6 lg:grid-cols-[1.8fr_1fr]">
          <div className="space-y-6">
            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-3 text-slate-700">
                <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-100 text-sky-700">
                  <Mic className="h-6 w-6" />
                </span>
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.24em] text-sky-600">Speaking Practice</p>
                  <h1 className="mt-2 text-3xl font-bold text-slate-900">Master your speaking skills</h1>
                </div>
              </div>
              <p className="mt-6 text-sm leading-6 text-slate-600">
                Practice PTE speaking formats with AI-powered scoring and real-time feedback. Master Read Aloud, Repeat Sentence, Describe Image, Retell Lecture, and more.
              </p>
            </section>

            <QuestionListTable
              questionType={{
                name: 'Speaking Practice',
                description: 'Select a question to practice speaking tasks with instant AI feedback.',
                timeLimit: 5 * 60,
              }}
              questions={questions}
              basePath="/academic/practice/speaking"
              backLink="/academic/practice"
              title="Back to practice hub"
            />
          </div>

          <aside className="space-y-6">
            <Card className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <CardHeader>
                <CardTitle className="text-base font-semibold">Speaking Tips</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm text-slate-600">
                <p>Focus on clear pronunciation, natural fluency, and appropriate pacing. Avoid long pauses and filler words.</p>
                <div className="space-y-3">
                  {[
                    'Speak clearly and at a natural pace.',
                    'Listen carefully to the prompt or audio.',
                    'Use varied vocabulary and sentence structures.',
                  ].map((tip) => (
                    <div key={tip} className="rounded-2xl bg-sky-50 p-3">
                      <div className="flex items-start gap-2">
                        <Sparkles className="mt-0.5 h-4 w-4 text-sky-600" />
                        <p>{tip}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </aside>
        </div>
      </div>
    </div>
  )
}
