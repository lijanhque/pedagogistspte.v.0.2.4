import { AcademicPracticeHeader } from '@/components/pte/practice-header'
import QuestionListTable from '@/components/pte/practice/QuestionListTable'
import { db } from '@/lib/db/drizzle'
import { pteQuestions } from '@/lib/db/schema/pte-questions'
import { eq } from 'drizzle-orm'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { BookOpen, Sparkles } from 'lucide-react'

export const dynamic = 'force-dynamic'

async function getReadingQuestions() {
  const questions = await db.query.pteQuestions.findMany({
    where: eq(pteQuestions.isActive, true),
    with: {
      questionType: true,
      reading: true,
    },
    limit: 20,
  })

  return questions.filter(
    (question) => question.questionType?.code?.startsWith('reading') && question.reading
  )
}

export default async function ReadingPracticePage() {
  const questions = await getReadingQuestions()

  return (
    <div className="bg-background min-h-screen">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <AcademicPracticeHeader section="reading" showFilters={false} />

        <div className="mt-8 grid gap-6 lg:grid-cols-[1.8fr_1fr]">
          <div className="space-y-6">
            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-3 text-slate-700">
                <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
                  <BookOpen className="h-6 w-6" />
                </span>
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.24em] text-emerald-600">Reading Practice</p>
                  <h1 className="mt-2 text-3xl font-bold text-slate-900">Sharpen your reading skills</h1>
                </div>
              </div>
              <p className="mt-6 text-sm leading-6 text-slate-600">
                Practice PTE reading formats with instant scoring and step-by-step feedback. Choose from multiple-choice, reorder paragraphs, drag-to-fill, and dropdown blanks questions.
              </p>
            </section>

            <QuestionListTable
              questionType={{
                name: 'Reading Practice',
                description: 'Select a question to practice reading comprehension and fill-in-the-blank tasks.',
                timeLimit: 10 * 60,
              }}
              questions={questions}
              basePath="/academic/practice/reading"
              backLink="/academic/practice"
              title="Back to practice hub"
            />
          </div>

          <aside className="space-y-6">
            <Card className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <CardHeader>
                <CardTitle className="text-base font-semibold">Reading Tips</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm text-slate-600">
                <p>Focus on the passage structure, identify keywords, and eliminate distractors in multiple-choice questions.</p>
                <div className="space-y-3">
                  {[
                    'Scan the passage first before selecting your answer.',
                    'Use the word bank carefully for fill-in-the-blank tasks.',
                    'Reorder paragraphs by meaning and logical flow.',
                  ].map((tip) => (
                    <div key={tip} className="rounded-2xl bg-emerald-50 p-3">
                      <div className="flex items-start gap-2">
                        <Sparkles className="mt-0.5 h-4 w-4 text-emerald-600" />
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
