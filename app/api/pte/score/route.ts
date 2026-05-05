import { NextRequest, NextResponse } from 'next/server';
import { scorePteAttemptV2 } from '@/lib/ai/scoring-agent';
import { QuestionType } from '@/lib/types';
import { db } from '@/lib/db/drizzle';
import { eq } from 'drizzle-orm';
import { pteQuestions } from '@/lib/db/schema';
import { savePteAttempt, trackAIUsage } from '@/lib/db/queries/pte-scoring';
import { auth } from '@/lib/auth/auth';
import { canUseAiScoring, deductAiCredit } from '@/lib/subscription/credits';
import { canStartPracticeQuestion, incrementPracticeQuestionCount } from '@/lib/subscription/practice-limits';

export async function POST(req: NextRequest) {
    try {
        // Get authenticated user
        const session = await auth.api.getSession({
            headers: req.headers,
        });

        if (!session?.user) {
            return NextResponse.json(
                { success: false, error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const { type, questionId, submission, timeTaken } = await req.json();

        if (!type || !questionId) {
            return NextResponse.json(
                { success: false, error: 'Missing type or questionId' },
                { status: 400 }
            );
        }

        // Fetch the question details from DB to get the answer key/content
        const question = await db.query.pteQuestions.findFirst({
            where: eq(pteQuestions.id, questionId),
        });

        if (!question) {
            return NextResponse.json(
                { success: false, error: 'Question not found' },
                { status: 404 }
            );
        }

        const questionType = type as QuestionType;

        // Check practice limits for this question type
        const section = questionType.includes('speaking') || questionType.includes('read_aloud') || questionType.includes('repeat') || questionType.includes('describe') || questionType.includes('retell') || questionType.includes('answer_short_question')
            ? 'speaking'
            : questionType.includes('writing') || questionType.includes('write_essay') || questionType.includes('summarize_written_text')
            ? 'writing'
            : questionType.includes('reading') || questionType.includes('multiple_choice_single') || questionType.includes('multiple_choice_multiple') || questionType.includes('reorder_paragraphs') || questionType.includes('fill_in_blanks') || questionType.includes('reading_writing_fill_blanks')
            ? 'reading'
            : 'listening';

        const practiceCheck = await canStartPracticeQuestion(session.user.id, section, questionType);
        if (!practiceCheck.allowed) {
            return NextResponse.json(
                { success: false, error: practiceCheck.reason || 'Practice limit reached' },
                { status: 429 }
            );
        }

        // Check AI credits if needed
        const creditCheck = await canUseAiScoring(session.user.id, questionType);
        if (!creditCheck.allowed) {
            return NextResponse.json(
                { success: false, error: creditCheck.reason || 'Insufficient AI credits' },
                { status: 429 }
            );
        }

        // Determine input type
        const agentSubmission = {
            text: submission.textAnswer || submission.userTranscript,
            audioUrl: submission.audioRecordingUrl,
        };

        // Use the Gemini-based Orchestration Agent (V2)
        const feedback = await scorePteAttemptV2(questionType, {
            questionContent: question.content || question.title,
            submission: agentSubmission,
        });

        // Increment practice question count
        await incrementPracticeQuestionCount(session.user.id, 1);

        // Deduct AI credits if needed
        if (creditCheck.allowed) {
            const creditsNeeded = questionType.includes('speaking') || questionType.includes('writing') ? 1 : 0;
            if (creditsNeeded > 0) {
                await deductAiCredit(session.user.id, creditsNeeded);
            }
        }

        // Save the attempt to the database
        const attempt = await savePteAttempt({
            userId: session.user.id,
            questionId,
            questionType,
            responseText: submission.textAnswer,
            responseAudioUrl: submission.audioRecordingUrl,
            responseData: submission,
            timeTaken,
            aiFeedback: feedback,
        });

        // Track AI usage (optional - for cost monitoring)
        await trackAIUsage({
            userId: session.user.id,
            attemptId: attempt.id,
            provider: 'google',
            model: 'gemini-1.5-pro-latest',
            // Note: Gemini doesn't provide token counts in the same way as OpenAI
            // You may need to estimate or use a different tracking method
            totalTokens: 0,
            cost: 0,
        });

        return NextResponse.json({
            success: true,
            data: {
                feedback,
                attemptId: attempt.id,
                attemptNumber: attempt.attemptNumber,
            },
        });
    } catch (error: any) {
        console.error('Scoring API Error:', error);
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        );
    }
}
