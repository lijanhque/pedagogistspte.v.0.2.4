'use client'

import React, { useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import { DndContext, DragOverlay, useDraggable, useDroppable, DragEndEvent, DragStartEvent } from '@dnd-kit/core';

interface FillBlanksDragDropProps {
  text: string;
  options: string[] | undefined;
  value: Record<string, string> | null;
  onChange: (val: Record<string, string>) => void;
}

/**
 * Split passage text into parts, separating blank markers from regular text.
 * Supports: ____ (underscores), (1)/(2)/(3) numbered markers, [blank] markers
 */
function splitTextWithBlanks(text: string): string[] {
  return text.split(/(__{3,}|\(\d+\)|\[blank\])/gi);
}

function isBlankMarker(part: string): boolean {
  return /^(__{3,}|\(\d+\)|\[blank\])$/i.test(part);
}

function DraggableWord({ word, id, isDragging }: { word: string; id: string; isDragging?: boolean }) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: id,
    data: { word }
  });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
  } : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      role="button"
      aria-label={`Drag word: ${word}`}
      className={cn(
        "bg-background hover:bg-accent border shadow-sm px-3 py-1.5 rounded-md text-sm font-medium cursor-grab active:cursor-grabbing inline-block m-1",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        isDragging && "opacity-50"
      )}
    >
      {word}
    </div>
  );
}

function DroppableSlot({ id, children, isOver }: { id: string; children?: React.ReactNode; isOver?: boolean }) {
  const { setNodeRef } = useDroppable({
    id: id,
  });

  return (
    <span
      ref={setNodeRef}
      role="group"
      aria-label={`Drop zone for blank`}
      className={cn(
        "inline-flex items-center justify-center min-w-[80px] h-8 mx-1 px-2 border-b-2 transition-colors rounded-sm",
        isOver
          ? "bg-primary/20 border-primary"
          : children
            ? "bg-primary/10 border-primary border-solid"
            : "bg-muted/50 border-muted-foreground/30 border-dashed"
      )}
    >
      {children || <span className="text-transparent select-none" aria-hidden="true">gap</span>}
    </span>
  );
}

function DroppableBank({ id, children, className }: { id: string; children: React.ReactNode; className?: string }) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div
      ref={setNodeRef}
      role="group"
      aria-label="Word bank - drag words from here"
      className={cn(className, isOver && "bg-muted-foreground/10 rounded-lg transition-colors")}
    >
      {children}
    </div>
  );
}

export default function FillBlanksDragDrop({ text, options = [], value, onChange }: FillBlanksDragDropProps) {
  const assignments = value || {};
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeWord, setActiveWord] = useState<string | null>(null);

  const parts = useMemo(() => splitTextWithBlanks(text), [text]);

  // Count blank slots
  let totalSlots = 0;
  parts.forEach(p => { if (isBlankMarker(p)) totalSlots++ });

  // Compute used words to filter bank
  const usedWords = Object.values(assignments);
  const availableOptions = options
    .map((opt, idx) => ({ word: opt, id: `bank-${opt}-${idx}` }))
    .filter(opt => !usedWords.includes(opt.word));

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
    setActiveWord(event.active.data.current?.word as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    setActiveWord(null);

    const draggedWord = active.data.current?.word as string | undefined;
    if (!draggedWord) return;

    // Find which slot the dragged item came from (if any)
    const sourceSlotKey = active.id.toString().startsWith('assigned-')
      ? active.id.toString().replace('assigned-', '')
      : null;

    if (!over) {
      // Dropped outside — if it was from a slot, return it to bank
      if (sourceSlotKey !== null) {
        const newAssignments = { ...assignments };
        delete newAssignments[sourceSlotKey];
        onChange(newAssignments);
      }
      return;
    }

    const overId = over.id as string;

    if (overId.startsWith('slot-')) {
      const targetSlotIndex = overId.replace('slot-', '');
      const newAssignments = { ...assignments };

      // Remove from source slot if dragged from one
      if (sourceSlotKey !== null) {
        delete newAssignments[sourceSlotKey];
      }

      // Place word in target slot
      newAssignments[targetSlotIndex] = draggedWord;
      onChange(newAssignments);
    } else if (overId === 'bank-container') {
      // Dropped back to bank — remove from source slot
      if (sourceSlotKey !== null) {
        const newAssignments = { ...assignments };
        delete newAssignments[sourceSlotKey];
        onChange(newAssignments);
      }
    }
  };

  // Fallback if no blanks found in text but we have options
  if (totalSlots === 0 && options.length > 0) {
    return (
      <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="space-y-6 select-none" role="group" aria-label="Drag and drop fill in the blanks">
          <div className="leading-relaxed text-[15px] p-6 border-2 rounded-lg bg-card/50">
            <p>{text}</p>
            <div className="mt-4 pt-4 border-t flex flex-wrap gap-3">
              {options.map((_, idx) => {
                const idxStr = idx.toString();
                const filledWord = assignments[idxStr];
                return (
                  <div key={`slot-fallback-${idx}`} className="flex items-center gap-2">
                    <span className="text-sm font-medium text-muted-foreground">Blank {idx + 1}:</span>
                    <DroppableSlot id={`slot-${idx}`}>
                      {filledWord ? (
                        <DraggableWord word={filledWord} id={`assigned-${idx}`} />
                      ) : null}
                    </DroppableSlot>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="bg-muted p-6 rounded-lg min-h-[80px]">
            <p className="text-xs text-muted-foreground uppercase font-bold mb-3 tracking-wider">
              Drag words to fill gaps
            </p>
            <DroppableBank id="bank-container" className="flex flex-wrap gap-2">
              {availableOptions.map((opt) => (
                <DraggableWord key={opt.id} word={opt.word} id={opt.id} />
              ))}
              {availableOptions.length === 0 && Object.keys(assignments).length > 0 && (
                <span className="text-sm text-green-600 font-medium">All words placed</span>
              )}
            </DroppableBank>
          </div>
        </div>
        <DragOverlay>
          {activeId ? (
            <div className="bg-primary text-primary-foreground shadow-xl px-3 py-1.5 rounded-md text-sm font-bold opacity-90 scale-105 pointer-events-none border border-white/20">
              {activeWord}
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    );
  }

  // Main render: passage with inline droppable slots
  let slotIndex = 0;

  return (
    <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="space-y-6 select-none" role="group" aria-label="Drag and drop fill in the blanks">

        {/* Text Area with inline slots */}
        <div className="leading-loose text-lg font-medium p-6 border-2 rounded-lg bg-card/50 shadow-sm">
          {parts.map((part, i) => {
            if (isBlankMarker(part)) {
              const currentIdx = slotIndex++;
              const filledWord = assignments[currentIdx.toString()];

              return (
                <DroppableSlot key={`slot-${currentIdx}`} id={`slot-${currentIdx}`}>
                  {filledWord ? (
                    <DraggableWord
                      word={filledWord}
                      id={`assigned-${currentIdx}`}
                    />
                  ) : null}
                </DroppableSlot>
              );
            }
            return <span key={`text-${i}`}>{part}</span>;
          })}
        </div>

        {/* Word Bank */}
        <div className="bg-muted p-6 rounded-lg min-h-[100px]">
          <p className="text-xs text-muted-foreground uppercase font-bold mb-3 tracking-wider">
            Drag words to fill gaps
          </p>
          <DroppableBank id="bank-container" className="flex flex-wrap gap-2">
            {availableOptions.map((opt) => (
              <DraggableWord key={opt.id} word={opt.word} id={opt.id} />
            ))}
            {availableOptions.length === 0 && Object.keys(assignments).length === options.length && (
              <span className="text-sm text-green-600 font-medium">All words placed</span>
            )}
            {availableOptions.length === 0 && Object.keys(assignments).length < options.length && (
              <span className="text-sm text-muted-foreground italic">Drag words back here to remove them</span>
            )}
          </DroppableBank>
        </div>

      </div>

      <DragOverlay>
        {activeId ? (
          <div className="bg-primary text-primary-foreground shadow-xl px-3 py-1.5 rounded-md text-sm font-bold opacity-90 scale-105 pointer-events-none border border-white/20">
            {activeWord}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
