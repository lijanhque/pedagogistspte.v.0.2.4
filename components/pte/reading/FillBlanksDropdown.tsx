'use client'

import React, { useMemo } from 'react'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'

interface FillBlanksDropdownProps {
    text: string
    options: Record<string, string[]> | undefined
    value: Record<string, string> | null
    onChange: (val: Record<string, string>) => void
}

/**
 * Split passage text into parts, separating blank markers from regular text.
 * Supports: ____ (underscores), (1)/(2)/(3) numbered markers, [blank] markers
 */
function splitTextWithBlanks(text: string): string[] {
    // Match: 3+ underscores, (number), or [blank]
    return text.split(/(__{3,}|\(\d+\)|\[blank\])/gi)
}

function isBlankMarker(part: string): boolean {
    return /^(__{3,}|\(\d+\)|\[blank\])$/i.test(part)
}

export default function FillBlanksDropdown({
    text,
    options = {},
    value,
    onChange,
}: FillBlanksDropdownProps) {
    const assignments = value || {}

    const parts = useMemo(() => splitTextWithBlanks(text), [text])

    // Count blank slots
    let totalSlots = 0
    parts.forEach(p => { if (isBlankMarker(p)) totalSlots++ })

    // If no blanks found in text but options are available, show options count
    const hasBlankSlots = totalSlots > 0
    const filledSlots = Object.values(assignments).filter(Boolean).length
    const optionKeys = Object.keys(options)

    // Fallback: if text has no blank markers but we have options, render a simpler UI
    if (!hasBlankSlots && optionKeys.length > 0) {
        return (
            <div className="space-y-4" role="group" aria-label="Fill in the blanks">
                <p className="text-xs text-muted-foreground font-medium mb-2">
                    Select the correct word for each blank ({filledSlots}/{optionKeys.length} completed)
                </p>
                <div className="leading-relaxed text-[15px] p-5 border-2 rounded-lg bg-card/50">
                    <p className="mb-4">{text}</p>
                    <div className="space-y-3 mt-4 pt-4 border-t">
                        {optionKeys.map((key) => {
                            const slotOptions = options[key] || []
                            const currentVal = assignments[key]
                            return (
                                <div key={key} className="flex items-center gap-3">
                                    <span className="text-sm font-medium text-muted-foreground min-w-[60px]">
                                        Blank {Number(key) + 1}:
                                    </span>
                                    <Select
                                        value={currentVal}
                                        onValueChange={(val) =>
                                            onChange({ ...assignments, [key]: val })
                                        }
                                    >
                                        <SelectTrigger
                                            className={cn(
                                                'w-[180px] h-9 text-sm font-medium transition-all',
                                                'border-2 rounded-lg',
                                                currentVal
                                                    ? 'border-primary/50 bg-primary/5 text-primary'
                                                    : 'border-dashed border-muted-foreground/40 hover:border-primary/40'
                                            )}
                                            aria-label={`Select word for blank ${Number(key) + 1}`}
                                        >
                                            <SelectValue placeholder="Select..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {slotOptions.map((opt) => (
                                                <SelectItem key={opt} value={opt}>
                                                    {opt}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            )
                        })}
                    </div>
                </div>
            </div>
        )
    }

    // Main render: passage with inline dropdown blanks
    let slotIndex = 0

    return (
        <div className="space-y-4" role="group" aria-label="Fill in the blanks">
            <p className="text-xs text-muted-foreground font-medium mb-2">
                Select the correct word for each blank ({filledSlots}/{totalSlots} completed)
            </p>
            <div className="leading-[2.5] text-[15px] p-5 border-2 rounded-lg bg-card/50">
                {parts.map((part, i) => {
                    if (isBlankMarker(part)) {
                        const currentIdx = slotIndex++
                        const idxStr = currentIdx.toString()
                        const slotOptions = options[idxStr] || []
                        const currentVal = assignments[idxStr]

                        return (
                            <span key={`blank-${currentIdx}`} className="inline-block mx-1 align-middle">
                                <Select
                                    value={currentVal}
                                    onValueChange={(val) =>
                                        onChange({ ...assignments, [idxStr]: val })
                                    }
                                >
                                    <SelectTrigger
                                        className={cn(
                                            'w-[160px] h-9 text-sm font-medium transition-all',
                                            'border-2 rounded-lg',
                                            currentVal
                                                ? 'border-primary/50 bg-primary/5 text-primary'
                                                : 'border-dashed border-muted-foreground/40 hover:border-primary/40'
                                        )}
                                        aria-label={`Select word for blank ${currentIdx + 1}`}
                                    >
                                        <SelectValue placeholder={`Blank ${currentIdx + 1}`} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {slotOptions.map((opt) => (
                                            <SelectItem key={opt} value={opt}>
                                                {opt}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </span>
                        )
                    }
                    return <span key={`text-${i}`}>{part}</span>
                })}
            </div>
        </div>
    )
}
