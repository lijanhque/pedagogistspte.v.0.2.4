'use client';

import { ReactNode, useEffect, useState } from 'react';
import { AlertCircle, Lock, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import Link from 'next/link';

interface TestAccessGateProps {
  userId: string;
  testType: 'speaking' | 'listening' | 'reading' | 'writing';
  canAccess: boolean;
  reason?: string;
  children: ReactNode;
  showUpgradePrompt?: boolean;
}

export function TestAccessGate({
  userId,
  testType,
  canAccess,
  reason,
  children,
  showUpgradePrompt = true,
}: TestAccessGateProps) {
  if (canAccess) {
    return <>{children}</>;
  }

  return (
    <div className="space-y-4">
      <Alert variant="destructive" className="border-red-300 bg-red-50">
        <Lock className="h-4 w-4 text-red-600" />
        <AlertDescription className="text-red-800">
          {reason || `${testType} practice is not available right now.`}
        </AlertDescription>
      </Alert>

      {showUpgradePrompt && (
        <div className="p-4 rounded-lg border border-blue-200 bg-blue-50 space-y-3">
          <p className="text-sm font-medium text-blue-900">Upgrade to unlock unlimited practice</p>
          <p className="text-xs text-blue-700">
            Get unlimited access to all {testType} questions with AI scoring feedback on Pro or Premium plans.
          </p>
          <Link href="/pricing">
            <Button className="w-full" size="sm">
              View Plans
              <ArrowRight className="ml-2 h-3 w-3" />
            </Button>
          </Link>
        </div>
      )}

      <div className="p-4 rounded-lg bg-muted/50 border border-border">
        <p className="text-xs text-muted-foreground">{children}</p>
      </div>
    </div>
  );
}
