/**
 * Mock Test Access Management System
 * Handles mock test attempt tracking and subscription tier limits
 */

import { and, eq, sql } from 'drizzle-orm';
import { db } from '@/lib/db/drizzle';
import { users } from '@/lib/db/schema/users';
import { getTierConfig, SubscriptionTier, canAccessMockTest as canAccessMockTestByTier } from './tiers';
import { pteMockTests } from '@/lib/db/schema/pte-attempts';
import { count } from 'drizzle-orm';

export interface MockTestAccessStatus {
  tier: SubscriptionTier;
  testsUsed: number;
  testsAvailable: number;
  canStartNewTest: boolean;
  reason?: string;
  nextResetAt?: Date;
}

/**
 * Get mock test access status for a user
 */
export async function getMockTestAccessStatus(userId: string): Promise<MockTestAccessStatus> {
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });

  if (!user) {
    throw new Error('User not found');
  }

  const tier = (user.subscriptionTier || 'free') as SubscriptionTier;
  const config = getTierConfig(tier);

  // Count completed tests for the current tier limit period
  // Free tier: limit 1 per month/account lifetime
  // Pro tier: unlimited (200 available)
  // Premium tier: unlimited (200 available)
  const result = await db.select({ count: count() })
    .from(pteMockTests)
    .where(
      and(
        eq(pteMockTests.userId, userId),
        eq(pteMockTests.status, 'completed')
      )
    );

  const testsUsed = result[0]?.count || 0;
  const testsAvailable = config.mockTestsAllowed === -1 ? 200 : config.mockTestsAllowed;

  // Check if can access based on tier and count
  const canStartNewTest = canAccessMockTestByTier(tier, testsUsed + 1);

  const reason = !canStartNewTest
    ? tier === SubscriptionTier.FREE
      ? 'You have used your 1 free mock test. Upgrade to Pro or Premium for unlimited access.'
      : 'All mock tests have been used.'
    : undefined;

  return {
    tier,
    testsUsed,
    testsAvailable,
    canStartNewTest,
    reason,
  };
}

/**
 * Check if user can start a new mock test (considering both tier and credit limits)
 */
export async function canStartMockTest(
  userId: string
): Promise<{ allowed: boolean; reason?: string }> {
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });

  if (!user) {
    return {
      allowed: false,
      reason: 'User not found',
    };
  }

  // Check tier-based mock test access
  const accessStatus = await getMockTestAccessStatus(userId);

  if (!accessStatus.canStartNewTest) {
    return {
      allowed: false,
      reason: accessStatus.reason,
    };
  }

  // If mock test requires AI scoring (which full mock tests do),
  // check if user has AI credits available
  if (user.dailyAiCredits !== -1) {
    const dailyUsed = user.aiCreditsUsed || 0;
    const dailyLimit = user.dailyAiCredits || 10;

    // Mock tests consume credits during submission, not start
    // So we just check if they have at least 1 credit left
    if (dailyUsed >= dailyLimit) {
      return {
        allowed: false,
        reason: `No AI credits remaining today. Resets at midnight.`,
      };
    }
  }

  return { allowed: true };
}

/**
 * Start a mock test session
 * Reserves a slot for the user; actual credit deduction happens on submit
 */
export async function startMockTestSession(userId: string, testName: string): Promise<string> {
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });

  if (!user) {
    throw new Error('User not found');
  }

  // Check access first
  const accessCheck = await canStartMockTest(userId);
  if (!accessCheck.allowed) {
    throw new Error(accessCheck.reason || 'Cannot start mock test');
  }

  // Create the mock test session
  const [mockTest] = await db.insert(pteMockTests).values({
    userId,
    testName,
    status: 'in_progress',
    startedAt: new Date(),
  }).returning();

  return mockTest.id;
}

/**
 * Get remaining mock tests for user
 */
export async function getRemainingMockTests(userId: string): Promise<number> {
  const status = await getMockTestAccessStatus(userId);

  if (status.testsAvailable === -1) {
    return -1; // Unlimited
  }

  return Math.max(0, status.testsAvailable - status.testsUsed);
}

/**
 * Get mock test access message
 */
export function getMockTestAccessMessage(status: MockTestAccessStatus): string {
  if (status.testsAvailable === -1) {
    return 'Unlimited mock tests available';
  }

  const remaining = Math.max(0, status.testsAvailable - status.testsUsed);

  if (remaining === 0) {
    return status.reason || 'No mock tests available';
  }

  return `${remaining} of ${status.testsAvailable} mock tests remaining`;
}

/**
 * Check if user is eligible for a specific mock test number
 */
export async function canAccessSpecificMockTest(userId: string, testNumber: number): Promise<boolean> {
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });

  if (!user) {
    return false;
  }

  const tier = (user.subscriptionTier || 'free') as SubscriptionTier;
  return canAccessMockTestByTier(tier, testNumber);
}
