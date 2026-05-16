import React from 'react'
import { QuestionType, AnswerData } from '@/lib/types'
import MultipleChoice from './MultipleChoice'
import ReorderParagraphs from './ReorderParagraphsComponent'
import FillBlanksDragDrop from './FillBlanksDragDrop'
import FillBlanksDropdown from './FillBlanksDropdown'

interface ReadingInputProps {
    questionType: string
    question: {
        id: string
        title?: string | null
        promptText?: string | null
        options?: any // Normalized by parent: string[] for MCQ, Record<string,string[]> for dropdown FIB, string[] for drag FIB
        paragraphs?: string[] // For reorder
        textWithBlanks?: string // Passage text with blank markers for FIB
    }
    value: AnswerData | null
    onChange: (value: AnswerData) => void
}

export default function ReadingInput({
    questionType,
    question,
    value,
    onChange,
}: ReadingInputProps) {
    const type = questionType as QuestionType

    switch (type) {
        case QuestionType.MULTIPLE_CHOICE_SINGLE:
        case QuestionType.MULTIPLE_CHOICE_MULTIPLE:
            return (
                <MultipleChoice
                    type={type}
                    options={question.options}
                    value={value}
                    onChange={onChange}
                />
            )

        case QuestionType.REORDER_PARAGRAPHS:
            return (
                <ReorderParagraphs
                    paragraphs={question.paragraphs || []}
                    value={value?.orderedParagraphs || null}
                    onChange={(val: string[]) => onChange({ ...value, orderedParagraphs: val })}
                />
            )

        case QuestionType.READING_BLANKS: // Drag and Drop
            return (
                <FillBlanksDragDrop
                    text={question.textWithBlanks || question.promptText || ''}
                    options={question.options}
                    value={value?.filledBlanks || null}
                    onChange={(val: Record<string, string>) =>
                        onChange({ ...value, filledBlanks: val })
                    }
                />
            )

        case QuestionType.READING_WRITING_BLANKS: // Dropdown
            return (
                <FillBlanksDropdown
                    text={question.textWithBlanks || question.promptText || ''}
                    options={question.options}
                    value={value?.filledBlanks || null}
                    onChange={(val: Record<string, string>) =>
                        onChange({ ...value, filledBlanks: val })
                    }
                />
            )

        default:
            return (
                <div className="p-4 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200 border border-yellow-200 dark:border-yellow-800" role="alert">
                    <p className="font-semibold">Unsupported Question Type: {questionType}</p>
                    <p className="text-sm mt-1">This question type is not yet supported. Please try a different question.</p>
                </div>
            )
    }
}
