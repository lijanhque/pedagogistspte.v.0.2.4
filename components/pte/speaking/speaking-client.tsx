"use client";

import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  PlayCircle,
  RotateCcw,
} from "lucide-react";

import { useBeep } from "@/hooks/useBeep";
import { toast } from "@/hooks/use-toast";

import {
  SpeakingQuestion,
  SpeakingFeedbackData,
} from "@/lib/types";

import { SpeakingRecorder } from "@/components/pte/speaking/SpeakingRecorder";

type SpeakingStatus =
  | "idle"
  | "preparing"
  | "recording"
  | "recorded";

export function SpeakingPracticeClient({
  question,
  autoStart = false,
}: {
  question: SpeakingQuestion;
  autoStart?: boolean;
}) {
  const content = question.content || "";
  const questionType =
    question.questionType?.code ||
    question.questionTypeId;

  const timeLimit =
    question.questionType?.timeLimit || 40;

  const timings = {
    prep: questionType === "read_aloud" ? 35 : 10,
    record: timeLimit,
  };

  // =========================
  // STATE
  // =========================
  const [status, setStatus] =
    useState<SpeakingStatus>("idle");

  const [prepTime, setPrepTime] =
    useState(timings.prep);

  const [recordTime, setRecordTime] =
    useState(timings.record);

  const [recordedBlob, setRecordedBlob] =
    useState<Blob | null>(null);

  const [recordedUrl, setRecordedUrl] =
    useState<string | null>(null);

  const [transcript, setTranscript] =
    useState("");

  const prepTimerRef =
    useRef<NodeJS.Timeout | null>(null);

  const recordTimerRef =
    useRef<NodeJS.Timeout | null>(null);

  const { playBeep } = useBeep();

  // =========================
  // CLEANUP
  // =========================
  useEffect(() => {
    return () => {
      if (prepTimerRef.current)
        clearInterval(prepTimerRef.current);
      if (recordTimerRef.current)
        clearInterval(recordTimerRef.current);
    };
  }, []);

  // =========================
  // START SESSION
  // =========================
  const startSession = () => {
    setStatus("preparing");
    setPrepTime(timings.prep);
    setRecordTime(timings.record);

    startPrepTimer();
  };

  const startPrepTimer = () => {
    if (prepTimerRef.current)
      clearInterval(prepTimerRef.current);

    prepTimerRef.current = setInterval(() => {
      setPrepTime((prev) => {
        if (prev <= 1) {
          clearInterval(prepTimerRef.current!);
          beginRecording();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // =========================
  // RECORDING START
  // =========================
  const beginRecording = async () => {
    playBeep();

    setTimeout(() => {
      setStatus("recording");

      setRecordTime(timings.record);

      recordTimerRef.current =
        setInterval(() => {
          setRecordTime((prev) => {
            if (prev <= 1) {
              clearInterval(recordTimerRef.current!);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
    }, 300);
  };

  // =========================
  // AUDIO HANDLER
  // =========================
  const handleAudioRecorded = (blob: Blob) => {
    setRecordedBlob(blob);

    const url = URL.createObjectURL(blob);
    setRecordedUrl(url);

    setStatus("recorded");
  };

  // =========================
  // UI
  // =========================
  return (
    <div className="space-y-8">

      {/* QUESTION */}
      {content && (
        <div className="p-6 border rounded-xl">
          <p className="text-lg">{content}</p>
        </div>
      )}

      {/* CONTROLS */}
      <div className="text-center space-y-6">

        {/* IDLE */}
        {status === "idle" && (
          <Button
            onClick={startSession}
            size="lg"
          >
            <PlayCircle className="mr-2" />
            Start
          </Button>
        )}

        {/* PREPARING */}
        {status === "preparing" && (
          <div className="text-4xl font-bold">
            {prepTime}
          </div>
        )}

        {/* RECORDING */}
        {status === "recording" && (
          <div className="space-y-4">

            <div className="text-red-500 font-medium">
              Recording... {recordTime}s
            </div>

            <SpeakingRecorder
              autoStop
              stopTrigger={recordTime === 0}
              onTranscriptionChange={setTranscript}
              onAudioRecorded={handleAudioRecorded}
            />
          </div>
        )}

        {/* RECORDED */}
        {status === "recorded" &&
          recordedUrl && (
            <div className="space-y-4">

              <audio
                src={recordedUrl}
                controls
                className="w-full"
              />

              <Button
                onClick={() =>
                  setStatus("idle")
                }
              >
                <RotateCcw className="mr-2" />
                Retry
              </Button>
            </div>
          )}
      </div>
    </div>
  );
}
