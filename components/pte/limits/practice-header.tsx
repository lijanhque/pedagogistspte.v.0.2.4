'use client';

import { useEffect, useState, ReactNode } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Zap, Clock } from 'lucide-react';
import { getMockTestAccess } from '@/app/actions/mock-test-limits';
import { getPracticeLimitStatus } from '@/lib/subscription/practice-limits';

interface PracticeHeaderProps {
  section: 'speaking' | 'listening' | 'reading' | 'writing';
  userId: string;
}

export function PracticeHeader({ section, userId }: PracticeHeaderProps) {
  const [status, setStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const mockAccess = await getMockTestAccess();
        const practiceStatus = await getPracticeLimitStatus(userId);
        setStatus({
          mock: mockAccess,
          practice: practiceStatus,
        });
      } catch (error) {
        console.error('Failed to fetch status:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStatus();
  }, [userId]);

  if (loading || !status) return null;

  const { practice } = status;
  const warningLevel = practice.dailyRemaining <= 1;
  const criticalLevel = practice.dailyRemaining === 0;

  return (
    <div className="space-y-2 pb-4 border-b">
      {criticalLevel && (
        <Alert variant="destructive" className="border-red-300 bg-red-50">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            You have reached your daily practice limit. Resets tomorrow at midnight.
          </AlertDescription>
        </Alert>
      )}

      {warningLevel && !criticalLevel && (
        <Alert className="border-yellow-300 bg-yellow-50">
          <Clock className="h-4 w-4 text-yellow-600" />
          <AlertDescription className="text-yellow-800">
            Only {practice.dailyRemaining} practice question{practice.dailyRemaining !== 1 ? 's' : ''} remaining today.
          </AlertDescription>
        </Alert>
      )}

      <div className="flex items-center gap-2 flex-wrap">
        {practice.dailyRemaining > 0 && (
          <Badge variant="secondary" className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            <span>{practice.dailyRemaining} today</span>
          </Badge>
        )}

        {practice.monthlyRemaining > 0 && (
          <Badge variant="outline" className="flex items-center gap-1">
            <span>{practice.monthlyRemaining} this month</span>
          </Badge>
        )}
      </div>
    </div>
  );
}
 