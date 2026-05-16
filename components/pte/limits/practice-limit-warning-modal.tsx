'use client';

import { useState, ReactNode } from 'react';
import { AlertCircle, Clock, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface PracticeLimitWarningModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onContinue: () => void;
  limitType: 'daily' | 'monthly' | 'credits' | 'mock-test';
  remaining: number;
  total: number;
  resetsAt?: Date;
}

export function PracticeLimitWarningModal({
  open,
  onOpenChange,
  onContinue,
  limitType,
  remaining,
  total,
  resetsAt,
}: PracticeLimitWarningModalProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleContinue = async () => {
    setIsLoading(true);
    try {
      onContinue();
    } finally {
      setIsLoading(false);
    }
  };

  const getWarningMessage = () => {
    switch (limitType) {
      case 'daily':
        return {
          title: 'Daily Practice Limit',
          description: `You have ${remaining} practice questions remaining today. This will be your last attempt until tomorrow.`,
          icon: Clock,
        };
      case 'monthly':
        return {
          title: 'Monthly Practice Limit',
          description: `You have only ${remaining} practice questions remaining this month. Use them wisely!`,
          icon: AlertCircle,
        };
      case 'credits':
        return {
          title: 'Low AI Credits',
          description: `You have ${remaining} AI scoring credits remaining today. This question will use 1 credit.`,
          icon: Zap,
        };
      case 'mock-test':
        return {
          title: 'Mock Test Limit',
          description: `You have used your free mock test. Upgrade to Pro or Premium for unlimited mock tests.`,
          icon: AlertCircle,
        };
      default:
        return {
          title: 'Resource Limit',
          description: 'You are near your resource limit.',
          icon: AlertCircle,
        };
    }
  };

  const warning = getWarningMessage();
  const Icon = warning.icon;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <div className="flex items-start gap-3">
            <Icon className="h-5 w-5 text-yellow-600 mt-1 flex-shrink-0" />
            <div>
              <DialogTitle>{warning.title}</DialogTitle>
              <DialogDescription>{warning.description}</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {remaining === 0 && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {limitType === 'mock-test'
                ? 'You have reached your mock test limit'
                : limitType === 'credits'
                ? 'You have no AI credits remaining'
                : `You have reached your ${limitType} practice limit`}
            </AlertDescription>
          </Alert>
        )}

        {remaining > 0 && remaining <= 2 && (
          <Alert className="border-yellow-200 bg-yellow-50">
            <AlertCircle className="h-4 w-4 text-yellow-600" />
            <AlertDescription className="text-yellow-800">
              {remaining === 1 ? 'This is your last attempt' : `Only ${remaining} attempts remaining`}
            </AlertDescription>
          </Alert>
        )}

        {resetsAt && (
          <div className="text-sm text-muted-foreground">
            <p>
              Resets at{' '}
              <time dateTime={resetsAt.toISOString()}>
                {resetsAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </time>
            </p>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleContinue}
            disabled={remaining === 0 || isLoading}
            variant={remaining === 0 ? 'destructive' : 'default'}
          >
            {remaining === 0 ? 'Upgrade to Continue' : 'Continue'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
