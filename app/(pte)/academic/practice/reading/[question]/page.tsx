import { notFound } from 'next/navigation'
import ReadingPracticeClient from '@/components/pte/reading/ReadingPracticeClient'
import { db } from '@/lib/db/drizzle'
import { pteQuestions } from '@/lib/db/schema/pte-questions'
import { eq } from 'drizzle-orm'

export const dynamic = 'force-dynamic'

async function getQuestion(questionId: string) {
  return db.query.pteQuestions.findFirst({
    where: eq(pteQuestions.id, questionId),
    with: {
      questionType: true,
      reading: true,
    },
  })
}

interface ReadingQuestionPageProps {
  params: {
    question: string
  }
}

export default async function ReadingPracticeQuestionPage({ params }: ReadingQuestionPageProps) {
  const question = await getQuestion(params.question)

  if (!question || !question.questionType || !question.reading) {
    notFound()
  }

  return (
    <div className="bg-background min-h-screen">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <ReadingPracticeClient question={question} />
      </div>
    </div>
  )
}
