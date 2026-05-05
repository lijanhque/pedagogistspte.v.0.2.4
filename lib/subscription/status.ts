/**
 * Combined Credit and Practice Status Helper Functions
 * Provides unified status checking for UI components
 */

import { getCreditStatus } from './credits';
import { getPracticeLimitStatus } from './practice-limits';
import { getMockTestAccessStatus } from './mock-test-access';

export interface CombinedStatus {
  // AI Credits
  aiCredits: {
    total: number;
    used: number;
    remaining: number;
    resetsAt: Date | null;
    canUseAi: boolean;
  };

  // Practice Limits
  practice: {
    dailyTotal: number;
    dailyUsed: number;
    dailyRemaining: number;
    monthlyTotal: number;
    monthlyUsed: number;
    monthlyRemaining: number;
    canPractice: boolean;
    resetsAtDaily: Date;
    resetsAtMonthly: Date;
  };

  // Mock Tests
  mockTests: {
    tier: string;
    testsUsed: number;
    testsAvailable: number;
    canStartNewTest: boolean;
  };

  // Overall status
  canUseApp: boolean;
  messages: string[];
}

/**
 * Get combined status for all credit/practice/mock test limits
 */
export async function getCombinedStatus(userId: string): Promise<CombinedStatus> {
  const [creditStatus, practiceStatus, mockTestStatus] = await Promise.all([
    getCreditStatus(userId),
    getPracticeLimitStatus(userId),
    getMockTestAccessStatus(userId),
  ]);

  const messages: string[] = [];

  // AI Credits message
  if (creditStatus.total === -1) {
    messages.push('Unlimited AI scoring available');
  } else if (creditStatus.remaining === 0) {
    messages.push(`No AI credits remaining. Resets at ${creditStatus.resetsAt?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`);
  } else {
    messages.push(`${creditStatus.remaining} of ${creditStatus.total} AI credits remaining`);
  }

  // Practice limits message
  if (practiceStatus.canPractice) {
    if (practiceStatus.dailyTotal === -1) {
      messages.push('Unlimited practice questions available');
    } else {
      messages.push(`${practiceStatus.dailyRemaining} practice questions remaining today`);
    }
  } else {
    messages.push(practiceStatus.reason || 'Practice limit reached');
  }

  // Mock tests message
  if (mockTestStatus.canStartNewTest) {
    if (mockTestStatus.testsAvailable === -1) {
      messages.push('Unlimited mock tests available');
    } else {
      const remaining = Math.max(0, mockTestStatus.testsAvailable - mockTestStatus.testsUsed);
      messages.push(`${remaining} of ${mockTestStatus.testsAvailable} mock tests remaining`);
    }
  } else {
    messages.push(mockTestStatus.reason || 'No mock tests available');
  }

  return {
    aiCredits: {
      total: creditStatus.total,
      used: creditStatus.used,
      remaining: creditStatus.remaining,
      resetsAt: creditStatus.resetsAt,
      canUseAi: creditStatus.remaining > 0 || creditStatus.remaining === -1,
    },
    practice: {
      dailyTotal: practiceStatus.dailyTotal,
      dailyUsed: practiceStatus.dailyUsed,
      dailyRemaining: practiceStatus.dailyRemaining,
      monthlyTotal: practiceStatus.monthlyTotal,
      monthlyUsed: practiceStatus.monthlyUsed,
      monthlyRemaining: practiceStatus.monthlyRemaining,
      canPractice: practiceStatus.canPractice,
      resetsAtDaily: practiceStatus.resetsAtDaily,
      resetsAtMonthly: practiceStatus.resetsAtMonthly,
    },
    mockTests: {
      tier: mockTestStatus.tier,
      testsUsed: mockTestStatus.testsUsed,
      testsAvailable: mockTestStatus.testsAvailable,
      canStartNewTest: mockTestStatus.canStartNewTest,
    },
    canUseApp: practiceStatus.canPractice && (creditStatus.remaining > 0 || creditStatus.remaining === -1),
    messages,
  };
}

/**
 * Check if user can perform a specific action
 */
export async function canPerformAction(
  userId: string,
  action: 'practice' | 'mock-test' | 'ai-scoring',
  section?: string,
  questionType?: string
): Promise<{ allowed: boolean; reason?: string }> {
  switch (action) {
    case 'practice':
      if (!section || !questionType) {
        return { allowed: false, reason: 'Section and question type required for practice check' };
      }
      const { canStartPracticeQuestion } = await import('./practice-limits');
      return canStartPracticeQuestion(userId, section, questionType);

    case 'mock-test':
      const { canStartMockTest } = await import('./mock-test-access');
      return canStartMockTest(userId);

    case 'ai-scoring':
      if (!questionType) {
        return { allowed: false, reason: 'Question type required for AI scoring check' };
      }
      const { canUseAiScoring } = await import('./credits');
      return canUseAiScoring(userId, questionType);

    default:
      return { allowed: false, reason: 'Unknown action' };
  }
}

/**
 * Get user-friendly status message for UI display
 */
export function getStatusMessage(status: CombinedStatus): string {
  if (status.canUseApp) {
    return 'Ready to practice!';
  }

  // Find the most restrictive limit
  if (!status.practice.canPractice) {
    return status.practice.dailyRemaining === 0
      ? 'Daily practice limit reached. Resets tomorrow.'
      : 'Monthly practice limit reached. Resets next month.';
  }

  if (!status.aiCredits.canUseAi) {
    return `No AI credits remaining. Resets at ${status.aiCredits.resetsAt?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.`;
  }

  return 'Account limits reached';
}
