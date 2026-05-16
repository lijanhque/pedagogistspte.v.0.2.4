"use client";

import { cn } from "@/lib/utils";
import type { ComponentProps, ReactNode } from "react";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

export type TranscriptionSegmentData = {
  text: string;
  startSecond: number;
  endSecond: number;
};

interface TranscriptionContextValue {
  segments: TranscriptionSegmentData[];
  currentTime: number;
  onTimeUpdate: (time: number) => void;
  onSeek?: (time: number) => void;
}

const TranscriptionContext = createContext<TranscriptionContextValue | null>(
  null
);

const useTranscription = () => {
  const context = useContext(TranscriptionContext);
  if (!context) {
    throw new Error(
      "Transcription components must be used within <Transcription>"
    );
  }
  return context;
};

export type TranscriptionProps = Omit<ComponentProps<"div">, "children"> & {
  segments: TranscriptionSegmentData[];
  /** Current playback time in seconds. When provided, operates in controlled mode. */
  currentTime?: number;
  /** Callback fired when a segment is clicked, receives the segment start time. */
  onSeek?: (time: number) => void;
  children: (segment: TranscriptionSegmentData, index: number) => ReactNode;
};

export const Transcription = ({
  segments,
  currentTime: externalCurrentTime,
  onSeek,
  className,
  children,
  ...props
}: TranscriptionProps) => {
  const [internalTime, setInternalTime] = useState(0);

  // Support both controlled (externalCurrentTime) and uncontrolled modes
  const currentTime = externalCurrentTime ?? internalTime;

  const contextValue = useMemo(
    () => ({
      currentTime,
      onSeek,
      onTimeUpdate: setInternalTime,
      segments,
    }),
    [currentTime, onSeek, segments]
  );

  return (
    <TranscriptionContext.Provider value={contextValue}>
      <div
        className={cn(
          "flex flex-wrap gap-1 text-sm leading-relaxed",
          className
        )}
        data-slot="transcription"
        {...props}
      >
        {segments
          .filter((segment) => segment.text.trim())
          .map((segment, index) => children(segment, index))}
      </div>
    </TranscriptionContext.Provider>
  );
};

export type TranscriptionSegmentProps = ComponentProps<"button"> & {
  segment: TranscriptionSegmentData;
  index: number;
};

export const TranscriptionSegment = ({
  segment,
  index,
  className,
  onClick,
  ...props
}: TranscriptionSegmentProps) => {
  const { currentTime, onSeek } = useTranscription();

  const isActive =
    currentTime >= segment.startSecond && currentTime < segment.endSecond;
  const isPast = currentTime >= segment.endSecond;

  const handleClick = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      if (onSeek) {
        onSeek(segment.startSecond);
      }
      onClick?.(event);
    },
    [onSeek, segment.startSecond, onClick]
  );

  return (
    <button
      className={cn(
        "inline text-left transition-colors duration-150",
        isActive && "text-primary font-medium",
        isPast && "text-muted-foreground",
        !(isActive || isPast) && "text-muted-foreground/60",
        onSeek && "cursor-pointer hover:text-foreground",
        !onSeek && "cursor-default",
        className
      )}
      data-active={isActive}
      data-index={index}
      data-slot="transcription-segment"
      onClick={handleClick}
      type="button"
      {...props}
    >
      {segment.text}
    </button>
  );
};
