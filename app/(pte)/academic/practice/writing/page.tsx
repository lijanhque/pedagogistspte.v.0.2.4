import { AcademicPracticeHeader } from '@/components/pte/practice-header'
import QuestionListTable from '@/components/pte/practice/QuestionListTable'
import { db } from '@/lib/db/drizzle'
import { pteQuestions } from '@/lib/db/schema/pte-questions'
import { eq } from 'drizzle-orm'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PenSquare, Sparkles } from 'lucide-react'

export const dynamic = 'force-dynamic'

async function getWritingQuestions() {
  const questions = await db.query.pteQuestions.findMany({
    where: eq(pteQuestions.isActive, true),
    with: {
      questionType: true,
      writing: true,
    },
    limit: 20,
  })

  return questions.filter(
    (question) => question.questionType?.code?.startsWith('writing') && question.writing
  )
}

export default async function WritingPracticePage() {
  const questions = await getWritingQuestions()

  return (
    <div className="bg-background min-h-screen">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <AcademicPracticeHeader section="writing" showFilters={false} />

        <div className="mt-8 grid gap-6 lg:grid-cols-[1.8fr_1fr]">
          <div className="space-y-6">
            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-3 text-slate-700">
                <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
                  <PenSquare className="h-6 w-6" />
                </span>
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.24em] text-amber-600">Writing Practice</p>
                  <h1 className="mt-2 text-3xl font-bold text-slate-900">Enhance your writing ability</h1>
                </div>
              </div>
              <p className="mt-6 text-sm leading-6 text-slate-600">
                Practice PTE writing formats with AI-powered feedback. Master Summarize Written Text, Essay writing, and other writing tasks with detailed scoring.
              </p>
            </section>

            <QuestionListTable
              questionType={{
                name: 'Writing Practice',
                description: 'Select a question to practice writing tasks with AI feedback.',
                timeLimit: 20 * 60,
              }}
              questions={questions}
              basePath="/academic/practice/writing"
              backLink="/academic/practice"
              title="Back to practice hub"
            />
          </div>

          <aside className="space-y-6">
            <Card className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <CardHeader>
                <CardTitle className="text-base font-semibold">Writing Tips</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm text-slate-600">
                <p>Focus on grammar, vocabulary, and structure. Meet word count requirements and organize your ideas logically.</p>
                <div className="space-y-3">
                  {[
                    'Check grammar and spelling carefully.',
                    'Use formal, academic language.',
                    'Organize with clear topic and supporting sentences.',
                  ].map((tip) => (
                    <div key={tip} className="rounded-2xl bg-amber-50 p-3">
                      <div className="flex items-start gap-2">
                        <Sparkles className="mt-0.5 h-4 w-4 text-amber-600" />
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
