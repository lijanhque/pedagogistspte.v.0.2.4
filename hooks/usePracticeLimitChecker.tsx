'use client';

import { useCallback, useState } from 'react';
import { getPracticeLimitStatus } from '@/lib/subscription/practice-limits';
import { canUseAiScoring } from '@/lib/subscription/credits';
import { PracticeLimitWarningModal } from '@/components/pte/limits/practice-limit-warning-modal';

interface UsePracticeLimitCheckerProps {
  userId: string;
  section: 'speaking' | 'listening' | 'reading' | 'writing';
  questionType: string;
}

export function usePracticeLimitChecker({ userId, section, questionType }: UsePracticeLimitCheckerProps) {
  const [showWarning, setShowWarning] = useState(false);
  const [warningData, setWarningData] = useState<{
    limitType: 'daily' | 'monthly' | 'credits' | 'mock-test';
    remaining: number;
    total: number;
    resetsAt?: Date;
  } | null>(null);

  const checkLimitsBeforeSubmit = useCallback(
    async (onContinue: () => Promise<void>) => {
      try {
        // Check practice limits
        const practiceStatus = await getPracticeLimitStatus(userId);

        if (!practiceStatus.canPractice) {
          const limitType = practiceStatus.dailyRemaining === 0 ? 'daily' : 'monthly';
          setWarningData({
            limitType,
            remaining: limitType === 'daily' ? practiceStatus.dailyRemaining : practiceStatus.monthlyRemaining,
            total: limitType === 'daily' ? practiceStatus.dailyTotal : practiceStatus.monthlyTotal,
            resetsAt: limitType === 'daily' ? practiceStatus.resetsAtDaily : practiceStatus.resetsAtMonthly,
          });
          setShowWarning(true);
          return;
        }

        // Check if this is the last attempt
        if (practiceStatus.dailyRemaining === 1 || practiceStatus.monthlyRemaining === 1) {
          setWarningData({
            limitType: practiceStatus.dailyRemaining === 1 ? 'daily' : 'monthly',
            remaining: practiceStatus.dailyRemaining === 1 ? practiceStatus.dailyRemaining : practiceStatus.monthlyRemaining,
            total: practiceStatus.dailyRemaining === 1 ? practiceStatus.dailyTotal : practiceStatus.monthlyTotal,
            resetsAt: practiceStatus.dailyRemaining === 1 ? practiceStatus.resetsAtDaily : practiceStatus.resetsAtMonthly,
          });
          setShowWarning(true);
          return;
        }

        // Check AI credits if needed (for speaking/writing)
        if (questionType.includes('speaking') || questionType.includes('write')) {
          const creditCheck = await canUseAiScoring(userId, questionType);

          if (!creditCheck.allowed) {
            setWarningData({
              limitType: 'credits',
              remaining: 0,
              total: 1,
            });
            setShowWarning(true);
            return;
          }

          // If credits are low, show warning
          // ... you could add a check here for low credits
        }

        // All checks passed, proceed
        await onContinue();
      } catch (error) {
        console.error('Error checking practice limits:', error);
        throw error;
      }
    },
    [userId, questionType]
  );

  return {
    showWarning,
    warningData,
    setShowWarning,
    checkLimitsBeforeSubmit,
    WarningModal: warningData
      ? () => (
          <PracticeLimitWarningModal
            open={showWarning}
            onOpenChange={setShowWarning}
            onContinue={() => {
              setShowWarning(false);
              setWarningData(null);
            }}
            limitType={warningData.limitType}
            remaining={warningData.remaining}
            total={warningData.total}
            resetsAt={warningData.resetsAt}
          />
        )
      : null,
  };
}
