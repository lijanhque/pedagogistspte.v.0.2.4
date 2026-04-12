'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { ArrowLeft, Loader2, Send, BookOpen, Clock, CheckCircle2, RotateCcw } from 'lucide-react'
import { toast } from '@/hooks/use-toast'
import ReadingInput from './ReadingInput'
import { AnswerData, AIFeedbackData, ReadingQuestion, QuestionType } from '@/lib/types'
import { scoreReadingAttempt } from '@/app/actions/pte'
import { CountdownTimer } from '@/components/pte/timers/CountdownTimer'
import { ReadingScoreModal } from './ReadingScoreModal'

interface ReadingPracticeClientProps {
    question: ReadingQuestion
}

const TYPE_LABELS: Record<string, string> = {
    [QuestionType.MULTIPLE_CHOICE_SINGLE]: 'Multiple Choice (Single)',
    [QuestionType.MULTIPLE_CHOICE_MULTIPLE]: 'Multiple Choice (Multiple)',
    [QuestionType.REORDER_PARAGRAPHS]: 'Reorder Paragraphs',
    [QuestionType.READING_BLANKS]: 'Fill in the Blanks (Drag & Drop)',
    [QuestionType.READING_WRITING_BLANKS]: 'Reading & Writing: Fill in the Blanks',
}

const TYPE_INSTRUCTIONS: Record<string, string> = {
    [QuestionType.MULTIPLE_CHOICE_SINGLE]: 'Read the passage carefully and choose the single best answer.',
    [QuestionType.MULTIPLE_CHOICE_MULTIPLE]: 'Read the passage carefully and choose all answers that apply.',
    [QuestionType.REORDER_PARAGRAPHS]: 'Drag and reorder the paragraphs to form a coherent passage.',
    [QuestionType.READING_BLANKS]: 'Drag words from the word bank to fill in the blanks.',
    [QuestionType.READING_WRITING_BLANKS]: 'Select the correct word from each dropdown to complete the passage.',
}

export default function ReadingPracticeClient({ question }: ReadingPracticeClientProps) {
    const router = useRouter()
    const [answer, setAnswer] = useState<AnswerData | null>(null)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [feedback, setFeedback] = useState<AIFeedbackData | null>(null)
    const [isModalOpen, setIsModalOpen] = useState(false)

    const typeCode = question.questionType?.code || question.questionTypeId
    const typeName = TYPE_LABELS[typeCode] || question.questionType?.name || 'Reading'
    const instruction = TYPE_INSTRUCTIONS[typeCode]
    const timeLimit = question.questionType?.timeLimit || 600

    const handleAnswerChange = (val: AnswerData) => {
        setAnswer(val)
    }

    const handleSubmit = async () => {
        if (!answer) {
            toast({
                title: "No answer provided",
                description: "Please answer the question before submitting.",
                variant: "destructive"
            })
            return
        }

        setIsSubmitting(true)
        try {
            let typeEnum: any = question.questionType?.code

            let userResponse: any = null
            userResponse = answer

            const result = await scoreReadingAttempt(
                typeEnum as any,
                question.reading?.questionText || question.content || '',
                question.id,
                question.reading?.options?.choices as string[],
                question.reading?.options?.paragraphs as string[],
                question.reading?.correctAnswerPositions,
                userResponse
            )

            if (result.success) {
                setFeedback(result.feedback || null)
                setIsModalOpen(true)
                toast({
                    title: "Scored successfully",
                    description: "Your answer has been evaluated.",
                })
            } else {
                toast({
                    title: "Submission failed",
                    description: result.error || "Unknown error",
                    variant: "destructive"
                })
            }
        } catch (error) {
            console.error(error)
            toast({
                title: "Error",
                description: "Failed to submit answer",
                variant: "destructive"
            })
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleRetry = () => {
        setIsModalOpen(false)
        setFeedback(null)
        setAnswer(null)
    }

    return (
        <div className="container mx-auto px-4 py-6 space-y-6 max-w-4xl">
            {/* Top Navigation Bar */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Button
                        variant="ghost"
                        size="sm"
                        className="gap-2 text-muted-foreground hover:text-foreground"
                        onClick={() => router.back()}
                    >
                        <ArrowLeft className="h-4 w-4" /> Back
                    </Button>
                </div>
                <CountdownTimer
                    initialSeconds={timeLimit}
                    onComplete={() => {
                        toast({
                            title: "Time's up!",
                            description: "Submitting your answer automatically.",
                        });
                        handleSubmit();
                    }}
                />
            </div>

            {/* Question Type Header */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 rounded-xl border border-blue-100 dark:border-blue-900/30 p-5">
                <div className="flex items-center gap-3 mb-2">
                    <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/50">
                        <BookOpen className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                        <Badge variant="secondary" className="mb-1 text-xs font-medium bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300">
                            {typeName}
                        </Badge>
                        <h1 className="text-lg font-semibold text-foreground">{question.title}</h1>
                    </div>
                </div>
                {instruction && (
                    <p className="text-sm text-blue-700/80 dark:text-blue-300/80 mt-2 pl-[52px]">
                        {instruction}
                    </p>
                )}
            </div>

            {/* Main Content Card */}
            <Card className="border shadow-sm overflow-hidden">
                <CardContent className="p-0">
                    {/* Image */}
                    {question.imageUrl && (
                        <div className="border-b bg-muted/10 p-6 flex justify-center">
                            <Image
                                src={question.imageUrl}
                                alt="Question Image"
                                width={600}
                                height={400}
                                className="max-h-[400px] w-auto object-contain rounded-lg"
                            />
                        </div>
                    )}

                    {/* Passage */}
                    {question.reading?.passageText && (
                        <div className="border-b">
                            <div className="px-6 py-4 bg-muted/20">
                                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                                    <BookOpen className="h-3.5 w-3.5" /> Reading Passage
                                </h3>
                                <div className="prose dark:prose-invert max-w-none text-[15px] leading-relaxed">
                                    {question.reading.passageText}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Question Text */}
                    {question.reading?.questionText && (
                        <div className="px-6 pt-5 pb-2">
                            <p className="text-base font-medium text-foreground">
                                {question.reading.questionText}
                            </p>
                        </div>
                    )}

                    {/* Answer Input Area */}
                    <div className="px-6 py-5">
                        <ReadingInput
                            questionType={question.questionType?.code || question.questionTypeId}
                            question={{
                                id: question.id,
                                title: question.title,
                                promptText: question.reading?.questionText || question.content,
                                options: question.reading?.options?.choices || question.reading?.options?.options || question.reading?.options,
                                paragraphs: question.reading?.options?.paragraphs,
                                textWithBlanks: question.reading?.passageText
                            }}
                            value={answer}
                            onChange={handleAnswerChange}
                        />
                    </div>
                </CardContent>

                {/* Footer Actions */}
                <CardFooter className="flex justify-between border-t px-6 py-4 bg-muted/5">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleRetry}
                        className="gap-2"
                        disabled={!answer}
                    >
                        <RotateCcw className="h-3.5 w-3.5" /> Clear
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        disabled={isSubmitting || !answer}
                        className="min-w-[140px] gap-2"
                    >
                        {isSubmitting ? (
                            <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Scoring...
                            </>
                        ) : (
                            <>
                                <Send className="h-4 w-4" />
                                Submit Answer
                            </>
                        )}
                    </Button>
                </CardFooter>
            </Card>

            <ReadingScoreModal
                isOpen={isModalOpen}
                onOpenChange={setIsModalOpen}
                feedback={feedback}
                onRetry={handleRetry}
                onNext={() => router.back()}
            />
        </div>
    )
}
