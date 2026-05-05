/**
 * Practice Limits Management System
 * Handles daily practice attempt tracking and reset for users
 */

import { and, eq, sql } from 'drizzle-orm';
import { db } from '@/lib/db/drizzle';
import { users } from '@/lib/db/schema/users';
import { getTierConfig, SubscriptionTier } from './tiers';

export interface PracticeLimitStatus {
  dailyTotal: number;
  dailyUsed: number;
  dailyRemaining: number;
  monthlyTotal: number;
  monthlyUsed: number;
  monthlyRemaining: number;
  canPractice: boolean;
  reason?: string;
  resetsAtDaily: Date;
  resetsAtMonthly: Date;
}

/**
 * Check if it's a new day and reset daily practice count if needed
 */
export async function checkAndResetDailyPractice(userId: string): Promise<void> {
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });

  if (!user) {
    throw new Error('User not found');
  }

  const now = new Date();
  const lastReset = user.lastPracticeReset || new Date(0);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const lastResetDate = new Date(
    lastReset.getFullYear(),
    lastReset.getMonth(),
    lastReset.getDate()
  );

  // Reset if it's a new day
  if (today > lastResetDate) {
    await db
      .update(users)
      .set({
        practiceQuestionsUsed: 0,
        lastPracticeReset: now,
      })
      .where(eq(users.id, userId));
  }
}

/**
 * Check if it's a new month and reset monthly practice count if needed
 */
export async function checkAndResetMonthlyPractice(userId: string): Promise<void> {
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });

  if (!user) {
    throw new Error('User not found');
  }

  const now = new Date();
  const lastReset = user.lastMonthlyReset || new Date(0);

  // Reset if it's a new month
  if (
    now.getMonth() !== lastReset.getMonth() ||
    now.getFullYear() !== lastReset.getFullYear()
  ) {
    await db
      .update(users)
      .set({
        practiceQuestionsThisMonth: 0,
        lastMonthlyReset: now,
      })
      .where(eq(users.id, userId));
  }
}

/**
 * Get current practice limit status for a user
 */
export async function getPracticeLimitStatus(userId: string): Promise<PracticeLimitStatus> {
  // Reset counters if needed
  await checkAndResetDailyPractice(userId);
  await checkAndResetMonthlyPractice(userId);

  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });

  if (!user) {
    throw new Error('User not found');
  }

  const tier = (user.subscriptionTier || 'free') as SubscriptionTier;
  const config = getTierConfig(tier);

  // Daily limits
  const dailyTotal = user.dailyPracticeLimit || 3;
  const dailyUsed = user.practiceQuestionsUsed || 0;
  const dailyRemaining = Math.max(0, dailyTotal - dailyUsed);

  // Monthly limits
  const monthlyTotal = user.monthlyPracticeLimit || 10;
  const monthlyUsed = user.practiceQuestionsThisMonth || 0;
  const monthlyRemaining = Math.max(0, monthlyTotal - monthlyUsed);

  // Check if can practice
  const canPractice = dailyRemaining > 0 && monthlyRemaining > 0;
  const reason = !canPractice
    ? dailyRemaining === 0
      ? 'Daily practice limit reached. Resets tomorrow.'
      : 'Monthly practice limit reached. Resets next month.'
    : undefined;

  // Calculate reset times
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  tomorrow.setUTCHours(0, 0, 0, 0);

  const nextMonth = new Date(now);
  nextMonth.setUTCMonth(nextMonth.getUTCMonth() + 1, 1);
  nextMonth.setUTCHours(0, 0, 0, 0);

  return {
    dailyTotal,
    dailyUsed,
    dailyRemaining,
    monthlyTotal,
    monthlyUsed,
    monthlyRemaining,
    canPractice,
    reason,
    resetsAtDaily: tomorrow,
    resetsAtMonthly: nextMonth,
  };
}

/**
 * Check if user can practice a question of a specific type
 */
export async function canStartPracticeQuestion(
  userId: string,
  section: string,
  questionType: string
): Promise<{ allowed: boolean; reason?: string }> {
  const status = await getPracticeLimitStatus(userId);

  // First check overall daily/monthly limits
  if (!status.canPractice) {
    return {
      allowed: false,
      reason: status.reason,
    };
  }

  return { allowed: true };
}

/**
 * Increment practice question counter
 */
export async function incrementPracticeQuestionCount(userId: string, count: number = 1): Promise<boolean> {
  // Reset if needed first
  await checkAndResetDailyPractice(userId);
  await checkAndResetMonthlyPractice(userId);

  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });

  if (!user) {
    throw new Error('User not found');
  }

  const dailyUsed = user.practiceQuestionsUsed || 0;
  const monthlyUsed = user.practiceQuestionsThisMonth || 0;
  const dailyLimit = user.dailyPracticeLimit || 3;
  const monthlyLimit = user.monthlyPracticeLimit || 10;

  // Check if can increment
  if (dailyUsed + count > dailyLimit || monthlyUsed + count > monthlyLimit) {
    return false;
  }

  // Increment both counters
  await db
    .update(users)
    .set({
      practiceQuestionsUsed: dailyUsed + count,
      practiceQuestionsThisMonth: monthlyUsed + count,
    })
    .where(eq(users.id, userId));

  return true;
}

/**
 * Get practice limit message for user
 */
export function getPracticeLimitMessage(status: PracticeLimitStatus): string {
  if (!status.canPractice) {
    return status.reason || 'Practice limit reached';
  }

  if (status.dailyRemaining === -1) {
    return 'Unlimited practice questions available';
  }

  if (status.monthlyRemaining === -1) {
    return `${status.dailyRemaining} questions remaining today`;
  }

  return `${status.dailyRemaining} today (${status.monthlyRemaining} this month)`;
}
