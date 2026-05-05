'use client';

import { useEffect, useState } from 'react';
import { getCombinedStatus } from '@/lib/subscription/status';
import { AlertCircle, Zap, BookOpen, Clock } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface PracticeLimitDisplayProps {
  userId: string;
  showDetails?: boolean;
  variant?: 'compact' | 'full';
}

export function PracticeLimitDisplay({ userId, showDetails = true, variant = 'full' }: PracticeLimitDisplayProps) {
  const [status, setStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        // For now, we'll show a placeholder since getCombinedStatus is server-only
        // In production, you'd call an API endpoint instead
        setLoading(false);
      } catch (err) {
        setError('Failed to load limits');
        setLoading(false);
      }
    };

    fetchStatus();
  }, [userId]);

  if (loading) return null;

  if (variant === 'compact') {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Zap className="h-3 w-3" />
        <span>Credits remaining</span>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {status && (
        <>
          {/* AI Credits */}
          <div className="flex items-start gap-2 p-2 rounded-lg bg-blue-500/10 border border-blue-200/30">
            <Zap className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm">
              <div className="font-medium text-blue-900">AI Scoring Credits</div>
              <div className="text-xs text-blue-700">
                {status.aiCredits.remaining === -1 
                  ? 'Unlimited' 
                  : `${status.aiCredits.remaining} of ${status.aiCredits.total} remaining`}
              </div>
            </div>
          </div>

          {/* Practice Attempts */}
          <div className="flex items-start gap-2 p-2 rounded-lg bg-amber-500/10 border border-amber-200/30">
            <BookOpen className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm">
              <div className="font-medium text-amber-900">Practice Questions</div>
              <div className="text-xs text-amber-700">
                {status.practice.dailyRemaining === -1 
                  ? 'Unlimited today' 
                  : `${status.practice.dailyRemaining} remaining today`}
              </div>
            </div>
          </div>

          {/* Mock Tests */}
          <div className="flex items-start gap-2 p-2 rounded-lg bg-purple-500/10 border border-purple-200/30">
            <Clock className="h-4 w-4 text-purple-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm">
              <div className="font-medium text-purple-900">Mock Tests</div>
              <div className="text-xs text-purple-700">
                {status.mockTests.testsAvailable === -1 
                  ? 'Unlimited' 
                  : `${Math.max(0, status.mockTests.testsAvailable - status.mockTests.testsUsed)} remaining`}
              </div>
            </div>
          </div>

          {!status.canUseApp && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{status.messages[0]}</AlertDescription>
            </Alert>
          )}
        </>
      )}
    </div>
  );
}
