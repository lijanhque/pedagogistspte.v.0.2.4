'use client'

import React, { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Card, CardContent, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Loader2, Send, BookOpen, RotateCcw } from 'lucide-react'
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

// Question types where the passage text is embedded inside the input component (FIB types)
const INLINE_PASSAGE_TYPES = new Set([
    QuestionType.READING_BLANKS,
    QuestionType.READING_WRITING_BLANKS,
])

/**
 * Normalize MCQ options from various DB formats to string[]
 * Handles: string[], [{id, text}, ...], {choices: string[]}
 */
function normalizeMcqOptions(opts: any): string[] {
    if (!opts) return []
    // Already a string array
    if (Array.isArray(opts) && opts.length > 0 && typeof opts[0] === 'string') {
        return opts
    }
    // Array of objects with text property (SQL seed format)
    if (Array.isArray(opts) && opts.length > 0 && typeof opts[0] === 'object') {
        return opts.map((o: any) => o.text || o.label || String(o))
    }
    // Object with choices key
    if (opts.choices && Array.isArray(opts.choices)) {
        return normalizeMcqOptions(opts.choices)
    }
    return []
}

/**
 * Transform blanks data from DB format to dropdown map format
 * DB: [{position: 1, options: [...]}, ...] → Component: {"0": [...], "1": [...]}
 */
function normalizeBlanksOptions(opts: any): Record<string, string[]> {
    if (!opts) return {}
    const blanksArr = opts.blanks || opts
    if (Array.isArray(blanksArr)) {
        const map: Record<string, string[]> = {}
        blanksArr.forEach((b: any, i: number) => {
            if (b.options && Array.isArray(b.options)) {
                map[i.toString()] = b.options
            }
        })
        return map
    }
    // Already a map format {"0": [...], "1": [...]}
    if (typeof blanksArr === 'object') {
        const map: Record<string, string[]> = {}
        Object.entries(blanksArr).forEach(([key, val]) => {
            if (Array.isArray(val)) {
                map[key] = val as string[]
            }
        })
        if (Object.keys(map).length > 0) return map
    }
    return {}
}

/**
 * Extract flat word bank from blanks data for drag-drop FIB
 * Collects all options from all blanks into a single array
 */
function extractWordBank(opts: any): string[] {
    if (!opts) return []
    // If it has a wordBank key, use it directly
    if (opts.wordBank && Array.isArray(opts.wordBank)) return opts.wordBank
    // If it's a flat string array already
    if (Array.isArray(opts) && opts.length > 0 && typeof opts[0] === 'string') return opts
    // Extract from blanks array
    const blanksArr = opts.blanks || opts
    if (Array.isArray(blanksArr)) {
        const words: string[] = []
        blanksArr.forEach((b: any) => {
            if (b.options && Array.isArray(b.options)) {
                words.push(...b.options)
            }
        })
        // Deduplicate
        return [...new Set(words)]
    }
    return []
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
    const isFibType = INLINE_PASSAGE_TYPES.has(typeCode as QuestionType)

    // Normalize options for the current question type
    const normalizedData = useMemo(() => {
        const opts = question.reading?.options
        switch (typeCode) {
            case QuestionType.MULTIPLE_CHOICE_SINGLE:
            case QuestionType.MULTIPLE_CHOICE_MULTIPLE: {
                const choices = opts?.choices || opts?.options || opts
                return {
                    options: normalizeMcqOptions(choices),
                    paragraphs: undefined as string[] | undefined,
                    blanksMap: undefined as Record<string, string[]> | undefined,
                    wordBank: undefined as string[] | undefined,
                }
            }
            case QuestionType.REORDER_PARAGRAPHS:
                return {
                    options: undefined as string[] | undefined,
                    paragraphs: (opts?.paragraphs || []) as string[],
                    blanksMap: undefined as Record<string, string[]> | undefined,
                    wordBank: undefined as string[] | undefined,
                }
            case QuestionType.READING_WRITING_BLANKS:
                return {
                    options: undefined as string[] | undefined,
                    paragraphs: undefined as string[] | undefined,
                    blanksMap: normalizeBlanksOptions(opts),
                    wordBank: undefined as string[] | undefined,
                }
            case QuestionType.READING_BLANKS:
                return {
                    options: undefined as string[] | undefined,
                    paragraphs: undefined as string[] | undefined,
                    blanksMap: undefined as Record<string, string[]> | undefined,
                    wordBank: extractWordBank(opts),
                }
            default:
                return {
                    options: undefined as string[] | undefined,
                    paragraphs: undefined as string[] | undefined,
                    blanksMap: undefined as Record<string, string[]> | undefined,
                    wordBank: undefined as string[] | undefined,
                }
        }
    }, [typeCode, question.reading?.options])

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
        toast({
            title: "Scoring your answer...",
            description: "Please wait while we evaluate your response.",
        })

        try {
            const typeEnum = question.questionType?.code as QuestionType

            // Convert UI answer format to scoring format
            let userResponse: any = null
            switch (typeEnum) {
                case QuestionType.MULTIPLE_CHOICE_SINGLE: {
                    // answer is a bare number (index) from MultipleChoice component
                    const idx = typeof answer === 'number'
                        ? answer
                        : (answer as any)?.selectedOption
                    const optText = normalizedData.options?.[idx] || ''
                    userResponse = { selectedOption: optText }
                    break
                }
                case QuestionType.MULTIPLE_CHOICE_MULTIPLE: {
                    // answer is a number[] (indices) from MultipleChoice component
                    const indices: number[] = Array.isArray(answer)
                        ? answer
                        : (answer as any)?.selectedOptions || []
                    const optTexts = indices
                        .map((i: number) => normalizedData.options?.[i] || '')
                        .filter(Boolean)
                    userResponse = { selectedOptions: optTexts }
                    break
                }
                case QuestionType.REORDER_PARAGRAPHS:
                    userResponse = { orderedParagraphs: answer?.orderedParagraphs || [] }
                    break
                case QuestionType.READING_BLANKS:
                case QuestionType.READING_WRITING_BLANKS:
                    userResponse = { filledBlanks: answer?.filledBlanks || {} }
                    break
                default:
                    userResponse = answer
            }

            // For FIB types, use correctAnswer.blanks from base table;
            // for others, use correctAnswerPositions from reading table
            const answerKey = (typeEnum === QuestionType.READING_BLANKS || typeEnum === QuestionType.READING_WRITING_BLANKS)
                ? (question as any).correctAnswer
                : question.reading?.correctAnswerPositions

            const result = await scoreReadingAttempt(
                typeEnum as Parameters<typeof scoreReadingAttempt>[0],
                question.reading?.questionText || question.content || '',
                question.id,
                normalizedData.options,
                normalizedData.paragraphs,
                answerKey,
                userResponse
            )

            if (result.success && result.feedback) {
                setFeedback(result.feedback)
                setIsModalOpen(true)
                const score = result.feedback.overallScore
                const maxScore = result.feedback.maxScore
                toast({
                    title: score >= 50 ? "Well done!" : "Keep practicing!",
                    description: maxScore
                        ? `Your score: ${score}/${maxScore}`
                        : `Your score: ${score}/90`,
                })
            } else {
                toast({
                    title: "Scoring failed",
                    description: result.error || "Could not score your answer. Please try again.",
                    variant: "destructive"
                })
            }
        } catch (error) {
            console.error('Scoring error:', error)
            toast({
                title: "Error",
                description: "An unexpected error occurred while scoring. Please try again.",
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
        toast({
            title: "Cleared",
            description: "Your answer has been reset. Try again!",
        })
    }

    return (
        <div className="space-y-6 max-w-4xl mx-auto">
            {/* Top Navigation Bar */}
            <nav className="flex items-center justify-between" aria-label="Question navigation">
                <div className="flex items-center gap-3">
                    <Button
                        variant="ghost"
                        size="sm"
                        className="gap-2 text-muted-foreground hover:text-foreground"
                        onClick={() => router.back()}
                    >
                        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back
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
            </nav>

            {/* Question Type Header */}
            <header className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 rounded-xl border border-blue-100 dark:border-blue-900/30 p-5">
                <div className="flex items-center gap-3 mb-2">
                    <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/50" aria-hidden="true">
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
            </header>

            {/* Main Content Card */}
            <Card className="border shadow-sm overflow-hidden">
                <CardContent className="p-0">
                    {/* Image */}
                    {question.imageUrl && (
                        <figure className="border-b bg-muted/10 p-6 flex justify-center">
                            <Image
                                src={question.imageUrl}
                                alt={`Image for ${question.title}`}
                                width={600}
                                height={400}
                                className="max-h-[400px] w-auto object-contain rounded-lg"
                            />
                        </figure>
                    )}

                    {/* Passage — only shown for non-FIB types (FIB renders passage inline with blanks) */}
                    {!isFibType && question.reading?.passageText && (
                        <section className="border-b">
                            <div className="px-6 py-4 bg-muted/20">
                                <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                                    <BookOpen className="h-3.5 w-3.5" aria-hidden="true" /> Reading Passage
                                </h2>
                                <div className="prose dark:prose-invert max-w-none text-[15px] leading-relaxed">
                                    {question.reading.passageText}
                                </div>
                            </div>
                        </section>
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
                    <section className="px-6 py-5" aria-label="Answer area">
                        <ReadingInput
                            questionType={typeCode}
                            question={{
                                id: question.id,
                                title: question.title,
                                promptText: question.reading?.questionText || question.content,
                                options: typeCode === QuestionType.READING_WRITING_BLANKS
                                    ? normalizedData.blanksMap
                                    : typeCode === QuestionType.READING_BLANKS
                                        ? normalizedData.wordBank
                                        : normalizedData.options,
                                paragraphs: normalizedData.paragraphs,
                                textWithBlanks: question.reading?.passageText,
                            }}
                            value={answer}
                            onChange={handleAnswerChange}
                        />
                    </section>
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
                        <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" /> Clear
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        disabled={isSubmitting || !answer}
                        className="min-w-[140px] gap-2"
                    >
                        {isSubmitting ? (
                            <>
                                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                                Scoring...
                            </>
                        ) : (
                            <>
                                <Send className="h-4 w-4" aria-hidden="true" />
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
