import React from 'react'
import { QuestionType } from '@/lib/types'
import { cn } from '@/lib/utils'
import { Checkbox } from '@/components/ui/checkbox'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { Check } from 'lucide-react'

interface MultipleChoiceProps {
    type: QuestionType
    options: string[] | undefined
    value: any
    onChange: (val: any) => void
}

export default function MultipleChoice({
    type,
    options = [],
    value,
    onChange,
}: MultipleChoiceProps) {
    const isMultiple = type === QuestionType.MULTIPLE_CHOICE_MULTIPLE

    if (!options || options.length === 0) {
        return <div className="text-muted-foreground p-4">No options available.</div>
    }

    const optionLetters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']

    if (isMultiple) {
        const selected = (Array.isArray(value) ? value : []) as number[]

        const toggle = (index: number) => {
            if (selected.includes(index)) {
                onChange(selected.filter((i) => i !== index))
            } else {
                onChange([...selected, index].sort())
            }
        }

        return (
            <div className="space-y-2.5">
                <p className="text-xs text-muted-foreground font-medium mb-3">
                    Select all that apply ({selected.length} selected)
                </p>
                {options.map((opt, idx) => {
                    const isSelected = selected.includes(idx)
                    return (
                        <button
                            key={idx}
                            type="button"
                            onClick={() => toggle(idx)}
                            className={cn(
                                'flex items-start gap-3 w-full rounded-lg border-2 p-4 text-left transition-all duration-200',
                                'hover:shadow-sm',
                                isSelected
                                    ? 'border-primary bg-primary/5 shadow-sm'
                                    : 'border-border hover:border-primary/40 hover:bg-muted/30'
                            )}
                        >
                            <div className={cn(
                                'flex items-center justify-center w-7 h-7 rounded-md text-xs font-bold shrink-0 transition-colors',
                                isSelected
                                    ? 'bg-primary text-primary-foreground'
                                    : 'bg-muted text-muted-foreground'
                            )}>
                                {isSelected ? <Check className="h-4 w-4" /> : optionLetters[idx]}
                            </div>
                            <span className="text-sm leading-relaxed pt-0.5">{opt}</span>
                        </button>
                    )
                })}
            </div>
        )
    }

    // Single Choice
    return (
        <div className="space-y-2.5">
            <p className="text-xs text-muted-foreground font-medium mb-3">
                Choose the best answer
            </p>
            <RadioGroup
                value={value?.toString()}
                onValueChange={(val) => onChange(parseInt(val))}
                className="space-y-2.5"
            >
                {options.map((opt, idx) => {
                    const isSelected = value === idx
                    return (
                        <label
                            key={idx}
                            htmlFor={`opt-${idx}`}
                            className={cn(
                                'flex items-start gap-3 rounded-lg border-2 p-4 cursor-pointer transition-all duration-200',
                                'hover:shadow-sm',
                                isSelected
                                    ? 'border-primary bg-primary/5 shadow-sm'
                                    : 'border-border hover:border-primary/40 hover:bg-muted/30'
                            )}
                        >
                            <div className={cn(
                                'flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold shrink-0 transition-colors',
                                isSelected
                                    ? 'bg-primary text-primary-foreground'
                                    : 'bg-muted text-muted-foreground'
                            )}>
                                {optionLetters[idx]}
                            </div>
                            <div className="flex-1 pt-0.5">
                                <span className="text-sm leading-relaxed">{opt}</span>
                            </div>
                            <RadioGroupItem
                                value={idx.toString()}
                                id={`opt-${idx}`}
                                className="shrink-0 mt-0.5"
                            />
                        </label>
                    )
                })}
            </RadioGroup>
        </div>
    )
}
