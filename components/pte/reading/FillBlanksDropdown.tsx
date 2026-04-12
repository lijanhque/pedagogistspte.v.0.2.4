import React from 'react'
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
    options: { [key: string]: string[] } | undefined
    value: { [key: string]: string } | null
    onChange: (val: { [key: string]: string }) => void
}

export default function FillBlanksDropdown({
    text,
    options = {},
    value,
    onChange,
}: FillBlanksDropdownProps) {
    const assignments = value || {}

    const parts = text.split(/(_+)/g)
    let slotIndex = 0
    const totalSlots = parts.filter(p => p.match(/(_+)/)).length
    const filledSlots = Object.values(assignments).filter(Boolean).length

    return (
        <div className="space-y-4">
            <div className="text-xs text-muted-foreground font-medium mb-2">
                Select the correct word for each blank ({filledSlots}/{totalSlots} completed)
            </div>
            <div className="leading-[2.5] text-[15px] p-5 border-2 rounded-lg bg-card/50">
                {parts.map((part, i) => {
                    if (part.match(/(_+)/)) {
                        const currentIdx = slotIndex++
                        const idxStr = currentIdx.toString()
                        const slotOptions = options[idxStr] || []
                        const currentVal = assignments[idxStr]

                        return (
                            <span key={i} className="inline-block mx-1 align-middle">
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
                    return <span key={i}>{part}</span>
                })}
            </div>
        </div>
    )
}
