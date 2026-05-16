import { AcademicPracticeHeader } from '@/components/pte/practice-header'
import QuestionListTable from '@/components/pte/practice/QuestionListTable'
import { db } from '@/lib/db/drizzle'
import { pteQuestions } from '@/lib/db/schema/pte-questions'
import { eq } from 'drizzle-orm'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Headphones, Sparkles } from 'lucide-react'

export const dynamic = 'force-dynamic'

async function getListeningQuestions() {
  const questions = await db.query.pteQuestions.findMany({
    where: eq(pteQuestions.isActive, true),
    with: {
      questionType: true,
      listening: true,
    },
    limit: 20,
  })

  return questions.filter(
    (question) => question.questionType?.code?.startsWith('listening') && question.listening
  )
}

export default async function ListeningPracticePage() {
  const questions = await getListeningQuestions()

  return (
    <div className="bg-background min-h-screen">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <AcademicPracticeHeader section="listening" showFilters={false} />

        <div className="mt-8 grid gap-6 lg:grid-cols-[1.8fr_1fr]">
          <div className="space-y-6">
            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-3 text-slate-700">
                <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-100 text-violet-700">
                  <Headphones className="h-6 w-6" />
                </span>
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.24em] text-violet-600">Listening Practice</p>
                  <h1 className="mt-2 text-3xl font-bold text-slate-900">Improve your listening comprehension</h1>
                </div>
              </div>
              <p className="mt-6 text-sm leading-6 text-slate-600">
                Practice PTE listening formats with clear audio and instant scoring. Master Summarize Spoken Text, Dictation, and other listening tasks.
              </p>
            </section>

            <QuestionListTable
              questionType={{
                name: 'Listening Practice',
                description: 'Select a question to practice listening tasks with instant scoring.',
                timeLimit: 10 * 60,
              }}
              questions={questions}
              basePath="/academic/practice/listening"
              backLink="/academic/practice"
              title="Back to practice hub"
            />
          </div>

          <aside className="space-y-6">
            <Card className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <CardHeader>
                <CardTitle className="text-base font-semibold">Listening Tips</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm text-slate-600">
                <p>Focus on main ideas while listening. Take notes efficiently and distinguish key information from details.</p>
                <div className="space-y-3">
                  {[
                    'Listen for the main idea first.',
                    'Note key details and keywords.',
                    'Understand different accents and speaking speeds.',
                  ].map((tip) => (
                    <div key={tip} className="rounded-2xl bg-violet-50 p-3">
                      <div className="flex items-start gap-2">
                        <Sparkles className="mt-0.5 h-4 w-4 text-violet-600" />
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
