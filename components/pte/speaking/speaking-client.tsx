"use client";

import React, { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
    PlayCircle,
    RotateCcw,
    CheckCircle2,
    Volume2,
    Loader2,
    Upload,
    Brain,
    Clock,
} from "lucide-react";
import { useBeep } from "@/hooks/useBeep";
import { toast } from "@/hooks/use-toast";
import { QuestionType, SpeakingFeedbackData, SpeakingQuestion } from "@/lib/types";
import { uploadSpeakingAudio, scoreSpeakingFromUrl } from "@/app/actions/pte";
import { ScoreDisplay } from "@/components/pte/speaking/score-display";
import { SpeechInput } from "@/components/ai-elements/speech-input";

type SpeakingStatus =
    | "idle"
    | "playing_audio"
    | "preparing"
    | "recording"
    | "recorded"
    | "uploading"
    | "submitted"
    | "scoring"
    | "completed";

interface SpeakingPracticeClientProps {
    question: SpeakingQuestion;
    autoStart?: boolean;
}

export function SpeakingPracticeClient({
    question,
    autoStart = false,
}: SpeakingPracticeClientProps) {
    const questionId = question.id;
    const questionType = question.questionType?.code || question.questionTypeId;
    const content = question.content || "";
    const audioUrl = question.audioUrl || question.speaking?.audioPromptUrl || undefined;
    const imageUrl = question.imageUrl || undefined;
    const timeLimit = question.questionType?.timeLimit || 40;

    // Determine specific timings based on question type
    const getTimings = () => {
        switch (questionType) {
            case "read_aloud":
                return { prep: 35, record: 40 };
            case "repeat_sentence":
                return { prep: 3, record: 15 };
            case "describe_image":
                return { prep: 25, record: 40 };
            case "retell_lecture":
                return { prep: 10, record: 40 };
            case "answer_short_question":
                return { prep: 3, record: 10 };
            case "respond_to_situation":
                return { prep: 20, record: 40 };
            case "summarize_group_discussion":
                return { prep: 10, record: 40 };
            default:
                return { prep: 10, record: 40 };
        }
    };

    const timings = getTimings();
    const recordDuration = timeLimit || timings.record;

    const [status, setStatus] = useState<SpeakingStatus>("idle");
    const [prepTime, setPrepTime] = useState(timings.prep);
    const [recordTime, setRecordTime] = useState(recordDuration);
    const [feedback, setFeedback] = useState<SpeakingFeedbackData | null>(null);
    const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
    const [recordedUrl, setRecordedUrl] = useState<string | null>(null);
    const [uploadedAudioUrl, setUploadedAudioUrl] = useState<string | null>(null);
    const [transcript, setTranscript] = useState("");
    const [isRecordingActive, setIsRecordingActive] = useState(false);
    const [attemptNumber, setAttemptNumber] = useState<number | null>(null);

    const prepTimerRef = useRef<NodeJS.Timeout | null>(null);
    const recordTimerRef = useRef<NodeJS.Timeout | null>(null);
    const audioRef = useRef<HTMLAudioElement>(null);
    const { playBeep } = useBeep();
    const speechInputRef = useRef<HTMLDivElement>(null);

    // Cleanup timers
    useEffect(() => {
        return () => {
            if (prepTimerRef.current) clearInterval(prepTimerRef.current);
            if (recordTimerRef.current) clearInterval(recordTimerRef.current);
        };
    }, []);

    // Auto-Start Effect
    useEffect(() => {
        if (autoStart && status === 'idle') {
            const timer = setTimeout(() => {
                startSession();
            }, 500);
            return () => clearTimeout(timer);
        }
    }, [autoStart]);

    const getTypeKey = (): QuestionType => {
        switch (questionType) {
            case "read_aloud": return QuestionType.READ_ALOUD;
            case "repeat_sentence": return QuestionType.REPEAT_SENTENCE;
            case "describe_image": return QuestionType.DESCRIBE_IMAGE;
            case "retell_lecture": return QuestionType.RE_TELL_LECTURE;
            case "answer_short_question": return QuestionType.ANSWER_SHORT_QUESTION;
            case "respond_to_situation": return QuestionType.RESPOND_TO_A_SITUATION;
            case "summarize_group_discussion": return QuestionType.SUMMARIZE_GROUP_DISCUSSION;
            default: return QuestionType.READ_ALOUD;
        }
    };

    const startSession = () => {
        // Reset state
        setPrepTime(timings.prep);
        setRecordTime(recordDuration);
        setFeedback(null);
        setRecordedBlob(null);
        setRecordedUrl(null);
        setUploadedAudioUrl(null);
        setTranscript("");
        setIsRecordingActive(false);
        setAttemptNumber(null);

        // Flow depends on question type
        if (
            audioUrl &&
            (questionType === "repeat_sentence" ||
                questionType === "retell_lecture" ||
                questionType === "answer_short_question" ||
                questionType === "summarize_group_discussion")
        ) {
            setStatus("playing_audio");
            if (audioRef.current) {
                audioRef.current.play().catch((e) => {
                    console.error("Audio play failed", e);
                    toast({
                        title: "Auto-play blocked",
                        description: "Please click Start.",
                        variant: "destructive"
                    });
                    setStatus("idle");
                });
            }
        } else {
            startPrep();
        }
    };

    const startPrep = () => {
        setStatus("preparing");
        if (prepTimerRef.current) clearInterval(prepTimerRef.current);

        prepTimerRef.current = setInterval(() => {
            setPrepTime((prev) => {
                if (prev <= 1) {
                    if (prepTimerRef.current) clearInterval(prepTimerRef.current);
                    beginRecording();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
    };

    const beginRecording = () => {
        playBeep();
        setTimeout(() => {
            setStatus("recording");
            setIsRecordingActive(true);
            setRecordTime(recordDuration);
            // Start recording countdown
            if (recordTimerRef.current) clearInterval(recordTimerRef.current);
            recordTimerRef.current = setInterval(() => {
                setRecordTime((prev) => {
                    if (prev <= 1) {
                        if (recordTimerRef.current) clearInterval(recordTimerRef.current);
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
            // Trigger click on SpeechInput to start recording
            speechInputRef.current?.querySelector('button')?.click();
        }, 300);
    };

    const handleAudioEnded = () => {
        startPrep();
    };

    const handleRetry = () => {
        setFeedback(null);
        setRecordedBlob(null);
        setRecordedUrl(null);
        setUploadedAudioUrl(null);
        setTranscript("");
        setStatus("idle");
        setPrepTime(timings.prep);
        setRecordTime(recordDuration);
        setIsRecordingActive(false);
        setAttemptNumber(null);
    };

    const handleTranscriptionChange = (text: string) => {
        setTranscript(text);
    };

    const handleAudioRecorded = async (audioBlob: Blob): Promise<string> => {
        // Store the recorded blob
        setRecordedBlob(audioBlob);
        const url = URL.createObjectURL(audioBlob);
        setRecordedUrl(url);
        setStatus("recorded");
        setIsRecordingActive(false);
        if (recordTimerRef.current) clearInterval(recordTimerRef.current);
        return "";
    };

    // Step 1: Upload audio to Vercel Blob
    const handleUpload = async () => {
        if (!recordedBlob) return;
        setStatus("uploading");
        try {
            const file = new File([recordedBlob], "recording.webm", {
                type: "audio/webm",
            });
            const result = await uploadSpeakingAudio(file, questionId, questionType);
            if (result.success && result.audioUrl) {
                setUploadedAudioUrl(result.audioUrl);
                setRecordedUrl(result.audioUrl);
                setStatus("submitted");
                toast({
                    title: "Recording submitted successfully!",
                    description: "Your audio has been saved. Click 'AI Scoring' to get feedback.",
                });
            } else {
                toast({
                    title: "Upload failed",
                    description: result.error || "Failed to upload audio",
                    variant: "destructive",
                });
                setStatus("recorded");
            }
        } catch (error) {
            console.error("Upload error:", error);
            toast({ title: "Upload failed", variant: "destructive" });
            setStatus("recorded");
        }
    };

    // Step 2: Score using AI (from already-uploaded URL)
    const handleAIScoring = async () => {
        if (!uploadedAudioUrl) return;
        setStatus("scoring");
        try {
            const typeKey = getTypeKey();
            const result = await scoreSpeakingFromUrl(typeKey, uploadedAudioUrl, content, questionId);
            if (result.success && result.feedback) {
                setFeedback(result.feedback);
                if (result.attemptNumber) {
                    setAttemptNumber(result.attemptNumber);
                }
                setStatus("completed");
                toast({ title: "Scoring complete!" });
            } else {
                toast({
                    title: "Scoring failed",
                    description: result.error || "Failed to score attempt",
                    variant: "destructive",
                });
                setStatus("submitted");
            }
        } catch (error) {
            console.error("Scoring error:", error);
            toast({ title: "Scoring failed", variant: "destructive" });
            setStatus("submitted");
        }
    };

    const renderQuestionContent = () => {
        if (imageUrl) {
            return (
                <div className="mb-6 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-800 bg-gray-50 flex justify-center">
                    <div className="relative w-full max-w-md aspect-[4/3]">
                        <Image src={imageUrl} alt="Describe this image" fill className="object-contain" />
                    </div>
                </div>
            );
        }

        if (status === "playing_audio") {
            return (
                <div className="flex flex-col items-center justify-center p-12 bg-blue-50 dark:bg-blue-900/20 rounded-xl mb-6">
                    <div className="bg-blue-100 dark:bg-blue-800 p-4 rounded-full animate-pulse mb-4">
                        <Volume2 className="size-8 text-blue-600 dark:text-blue-300" />
                    </div>
                    <p className="font-medium text-blue-800 dark:text-blue-200">Listening...</p>
                </div>
            );
        }

        const showText = questionType === "read_aloud" || questionType === "respond_to_situation" || !audioUrl;
        if (showText && content) {
            return (
                <div className="bg-white dark:bg-[#1e1e20] p-6 rounded-xl border border-gray-100 dark:border-white/5 shadow-sm mb-6">
                    <p className="text-xl leading-relaxed font-medium text-gray-800 dark:text-gray-200">{content}</p>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="space-y-8">
            {audioUrl && <audio ref={audioRef} src={audioUrl} onEnded={handleAudioEnded} className="hidden" />}

            {renderQuestionContent()}

            <div className="bg-gray-50 dark:bg-white/[0.02] border border-gray-100 dark:border-white/5 rounded-xl p-6 flex flex-col items-center gap-4 transition-all min-h-[250px] justify-center">
                {/* IDLE: Start Practice */}
                {status === "idle" && (
                    <div className="text-center py-4">
                        <Button
                            size="lg"
                            onClick={startSession}
                            className="rounded-full px-8 h-14 gap-2 bg-primary text-lg shadow-xl hover:scale-105 transition-all"
                        >
                            <PlayCircle className="size-6" /> Start Practice
                        </Button>
                    </div>
                )}

                {/* PREPARING: Countdown */}
                {status === "preparing" && (
                    <div className="text-center space-y-4 w-full max-w-md animate-in fade-in zoom-in-95 duration-300">
                        <div className="flex justify-between items-end">
                            <span className="text-sm font-medium text-amber-600 dark:text-amber-400 uppercase tracking-widest">Preparing...</span>
                            <span className="text-xs text-muted-foreground">Starting in {prepTime}s</span>
                        </div>
                        <Progress value={(1 - prepTime / timings.prep) * 100} className="h-3 bg-amber-100 dark:bg-amber-900/20" />
                        <div className="text-6xl font-mono font-bold text-amber-500 tabular-nums">{prepTime}</div>
                        <p className="text-xs text-muted-foreground bg-amber-50 dark:bg-amber-900/10 py-2 px-4 rounded-full inline-block">Speak after the beep</p>
                    </div>
                )}

                {/* RECORDING: Active recording with countdown */}
                {status === "recording" && (
                    <div className="flex flex-col items-center gap-6 animate-in fade-in zoom-in-95 w-full max-w-2xl">
                        <div className="text-center space-y-2">
                            <p className="text-sm font-medium text-red-500 uppercase tracking-widest flex items-center justify-center gap-2">
                                <span className="relative flex h-3 w-3">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                                </span>
                                Recording
                            </p>
                            <div className="flex items-center justify-center gap-2 text-muted-foreground">
                                <Clock className="size-4" />
                                <span className="text-lg font-mono tabular-nums">{recordTime}s remaining</span>
                            </div>
                        </div>

                        <Progress
                            value={(1 - recordTime / recordDuration) * 100}
                            className="h-2 w-full max-w-sm bg-red-100 dark:bg-red-900/20"
                        />

                        <div ref={speechInputRef}>
                            <SpeechInput
                                onTranscriptionChange={handleTranscriptionChange}
                                onAudioRecorded={handleAudioRecorded}
                                size="icon"
                                variant="outline"
                                lang="en-US"
                                maxDuration={recordDuration}
                                autoStop={true}
                            />
                        </div>

                        {transcript && (
                            <div className="max-w-2xl w-full rounded-lg border bg-card p-4 text-sm">
                                <p className="text-muted-foreground mb-2">
                                    <strong>Live Transcript:</strong>
                                </p>
                                <p className="text-sm leading-relaxed">{transcript}</p>
                            </div>
                        )}
                    </div>
                )}

                {/* RECORDED: Recording done, show Submit Test button */}
                {status === "recorded" && (
                    <div className="text-center space-y-6 w-full max-w-2xl animate-in fade-in zoom-in-95 duration-300">
                        <div className="text-xl font-medium text-green-600 dark:text-green-400 flex items-center gap-2 justify-center">
                            <CheckCircle2 className="size-6" /> Recording Complete
                        </div>

                        {recordedUrl && (
                            <div className="space-y-4 w-full bg-white dark:bg-black/20 p-6 rounded-lg border border-gray-200 dark:border-white/10 text-left">
                                {/* biome-ignore lint/a11y/useMediaCaption: audio playback */}
                                <audio src={recordedUrl} controls className="w-full mb-4" />
                                {transcript && (
                                    <div className="bg-muted p-4 rounded-md text-sm">
                                        <h4 className="font-semibold text-xs uppercase text-muted-foreground mb-2">Transcript</h4>
                                        <p className="leading-relaxed">{transcript}</p>
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="flex gap-4 justify-center">
                            <Button variant="outline" size="lg" onClick={handleRetry} className="rounded-full h-12 px-8">
                                <RotateCcw className="size-4 mr-2" /> Retry
                            </Button>
                            <Button
                                size="lg"
                                onClick={handleUpload}
                                className="rounded-full h-12 px-8 bg-green-600 hover:bg-green-700 text-white shadow-lg shadow-green-900/20"
                            >
                                <Upload className="size-4 mr-2" /> Submit Test
                            </Button>
                        </div>
                    </div>
                )}

                {/* UPLOADING: Upload in progress */}
                {status === "uploading" && (
                    <div className="text-center space-y-4 animate-in fade-in zoom-in-95 duration-300">
                        <div className="bg-blue-100 dark:bg-blue-900/30 p-4 rounded-full inline-flex">
                            <Loader2 className="size-8 text-blue-600 animate-spin" />
                        </div>
                        <p className="text-lg font-medium text-blue-600 dark:text-blue-400">Uploading your recording...</p>
                        <p className="text-sm text-muted-foreground">Please wait while we save your audio</p>
                    </div>
                )}

                {/* SUBMITTED: Upload success, show AI Scoring button */}
                {status === "submitted" && (
                    <div className="text-center space-y-6 w-full max-w-2xl animate-in fade-in zoom-in-95 duration-300">
                        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-6">
                            <div className="flex items-center justify-center gap-2 mb-2">
                                <CheckCircle2 className="size-6 text-green-600" />
                                <p className="text-lg font-semibold text-green-700 dark:text-green-400">
                                    Recording Submitted Successfully!
                                </p>
                            </div>
                            <p className="text-sm text-green-600 dark:text-green-500">
                                Your audio has been saved. Click below to get AI-powered feedback on your response.
                            </p>
                        </div>

                        {recordedUrl && (
                            <div className="w-full bg-white dark:bg-black/20 p-4 rounded-lg border border-gray-200 dark:border-white/10">
                                {/* biome-ignore lint/a11y/useMediaCaption: audio playback */}
                                <audio src={recordedUrl} controls className="w-full" />
                            </div>
                        )}

                        <Button
                            size="lg"
                            onClick={handleAIScoring}
                            className="rounded-full h-14 px-10 bg-primary hover:bg-primary/90 text-lg shadow-xl hover:scale-105 transition-all gap-2"
                        >
                            <Brain className="size-5" /> AI Scoring
                        </Button>
                    </div>
                )}

                {/* SCORING: AI scoring in progress */}
                {status === "scoring" && (
                    <div className="text-center space-y-4 animate-in fade-in zoom-in-95 duration-300">
                        <div className="bg-purple-100 dark:bg-purple-900/30 p-4 rounded-full inline-flex">
                            <Brain className="size-8 text-purple-600 animate-pulse" />
                        </div>
                        <p className="text-lg font-medium text-purple-600 dark:text-purple-400">AI is analyzing your response...</p>
                        <p className="text-sm text-muted-foreground">Evaluating pronunciation, fluency, and content</p>
                        <div className="flex justify-center">
                            <Loader2 className="size-5 animate-spin text-muted-foreground" />
                        </div>
                    </div>
                )}
            </div>

            {/* COMPLETED: Show feedback */}
            {status === "completed" && feedback && (
                <div className="animate-in fade-in slide-in-from-bottom-8 duration-700">
                    {attemptNumber && (
                        <div className="text-center mb-4">
                            <span className="inline-flex items-center gap-1 text-sm bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 px-3 py-1 rounded-full">
                                Attempt #{attemptNumber}
                            </span>
                        </div>
                    )}
                    <ScoreDisplay
                        score={{
                            overallScore: feedback.overallScore,
                            content: feedback.content?.score || 0,
                            pronunciation: feedback.pronunciation?.score || 0,
                            fluency: feedback.fluency?.score || 0,
                            feedback: [],
                            detailedAnalysis: {
                                strengths: feedback.strengths || [],
                                improvements: feedback.areasForImprovement || [],
                                tips: feedback.suggestions || [],
                            },
                        }}
                        wordMarking={feedback.wordMarking}
                        spokenText={feedback.transcript || transcript}
                        originalText={content}
                        audioUrl={recordedUrl || undefined}
                        onClose={() => setFeedback(null)}
                    />
                    <div className="flex justify-center mt-8">
                        <Button variant="outline" onClick={handleRetry} className="gap-2">
                            <RotateCcw className="size-4" /> Try Another Attempt
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
