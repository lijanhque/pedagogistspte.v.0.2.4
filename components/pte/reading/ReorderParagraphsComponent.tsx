import React, { useEffect, useState } from 'react'
import { Reorder } from 'framer-motion'
import { GripVertical, MoveVertical } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ReorderParagraphsProps {
    paragraphs: string[]
    value: string[] | null
    onChange: (val: string[]) => void
}

export default function ReorderParagraphs({
    paragraphs,
    value,
    onChange,
}: ReorderParagraphsProps) {
    const [items, setItems] = useState<{ id: string; text: string }[]>([])
    const [draggedId, setDraggedId] = useState<string | null>(null)

    useEffect(() => {
        if (paragraphs.length === 0) return

        if (value && value.length === paragraphs.length) {
            const availableIndices = new Map<string, number[]>()
            paragraphs.forEach((text, i) => {
                if (!availableIndices.has(text)) availableIndices.set(text, [])
                availableIndices.get(text)!.push(i)
            })
            const usedIndices = new Set<number>()
            const newItems = value.map((text) => {
                const pool = availableIndices.get(text) ?? []
                const idx = pool.find((i) => !usedIndices.has(i)) ?? pool[0] ?? 0
                usedIndices.add(idx)
                return { id: `para-${idx}`, text }
            })

            setItems((prev) => {
                const prevOrder = prev.map((it) => it.id).join(',')
                const nextOrder = newItems.map((it) => it.id).join(',')
                return prevOrder === nextOrder ? prev : newItems
            })
        } else {
            const initialItems = paragraphs.map((text, i) => ({
                id: `para-${i}`,
                text,
            }))
            setItems(initialItems)
        }
    }, [paragraphs, value])

    const handleReorder = (newOrder: { id: string; text: string }[]) => {
        setItems(newOrder)
        onChange(newOrder.map((item) => item.text))
    }

    if (paragraphs.length === 0) {
        return <div className="text-muted-foreground p-4">No paragraphs to reorder.</div>
    }

    const letters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                <MoveVertical className="h-4 w-4" />
                <span>Drag and drop the paragraphs to form a coherent passage.</span>
            </div>

            <Reorder.Group
                axis="y"
                values={items}
                onReorder={handleReorder}
                className="w-full space-y-2.5"
            >
                {items.map((item, index) => (
                    <Reorder.Item
                        key={item.id}
                        value={item}
                        onDragStart={() => setDraggedId(item.id)}
                        onDragEnd={() => setDraggedId(null)}
                        className={cn(
                            'bg-card border-2 rounded-lg p-4 cursor-grab active:cursor-grabbing',
                            'flex items-start gap-3 select-none',
                            'transition-shadow duration-200',
                            'hover:shadow-md hover:border-primary/30',
                            draggedId === item.id
                                ? 'shadow-lg border-primary/50 bg-primary/5 scale-[1.02]'
                                : 'shadow-sm'
                        )}
                    >
                        <div className="flex items-center gap-2 shrink-0 pt-0.5">
                            <GripVertical className="h-5 w-5 text-muted-foreground/50" />
                            <div className="flex items-center justify-center w-7 h-7 rounded-md bg-muted text-xs font-bold text-muted-foreground">
                                {letters[index]}
                            </div>
                        </div>
                        <p className="text-sm leading-relaxed flex-1">{item.text}</p>
                    </Reorder.Item>
                ))}
            </Reorder.Group>

            <div className="text-xs text-muted-foreground text-right">
                {items.length} paragraphs to order
            </div>
        </div>
    )
}
