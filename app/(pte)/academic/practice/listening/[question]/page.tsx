import { notFound } from 'next/navigation'
import { db } from '@/lib/db/drizzle'
import { pteQuestions } from '@/lib/db/schema/pte-questions'
import { eq } from 'drizzle-orm'

export const dynamic = 'force-dynamic'

async function getQuestion(questionId: string) {
  return db.query.pteQuestions.findFirst({
    where: eq(pteQuestions.id, questionId),
    with: {
      questionType: true,
      listening: true,
    },
  })
}

interface ListeningQuestionPageProps {
  params: {
    question: string
  }
}

export default async function ListeningPracticeQuestionPage({ params }: ListeningQuestionPageProps) {
  const question = await getQuestion(params.question)

  if (!question || !question.questionType || !question.listening) {
    notFound()
  }

  // For listening, we'll render a basic placeholder that can be enhanced
  return (
    <div className="bg-background min-h-screen">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <h1 className="text-2xl font-bold text-slate-900">{question.title}</h1>
          <p className="mt-4 text-slate-600">Listening practice for: {question.questionType.name}</p>
          <p className="mt-2 text-sm text-slate-500">Question ID: {question.id}</p>
        </div>
      </div>
    </div>
  )
}
