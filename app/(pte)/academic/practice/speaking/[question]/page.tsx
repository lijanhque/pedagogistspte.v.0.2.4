import { notFound } from 'next/navigation'
import { SpeakingPracticeClient } from '@/components/pte/speaking/speaking-client'
import { db } from '@/lib/db/drizzle'
import { pteQuestions } from '@/lib/db/schema/pte-questions'
import { eq } from 'drizzle-orm'
import type { SpeakingQuestion } from '@/lib/types'

export const dynamic = 'force-dynamic'

async function getQuestion(questionId: string) {
  return db.query.pteQuestions.findFirst({
    where: eq(pteQuestions.id, questionId),
    with: {
      questionType: true,
      speaking: true,
    },
  })
}

interface SpeakingQuestionPageProps {
  params: {
    question: string
  }
}

export default async function SpeakingPracticeQuestionPage({ params }: SpeakingQuestionPageProps) {
  const question = await getQuestion(params.question)

  if (!question || !question.questionType || !question.speaking) {
    notFound()
  }

  return (
    <div className="bg-background min-h-screen">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <SpeakingPracticeClient question={question as SpeakingQuestion} />
      </div>
    </div>
  )
}
