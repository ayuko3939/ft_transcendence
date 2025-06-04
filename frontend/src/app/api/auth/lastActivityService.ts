"use server";

import { db } from "@/api/db";
import { user } from "@ft-transcendence/shared";
import { eq } from "drizzle-orm";

const lastUpdateCache = new Map<string, number>();

export async function updateLastActivity(userId: string): Promise<void> {
  const currentTime = new Date().getTime();
  const lastUpdate = lastUpdateCache.get(userId) || 0;

  // 2分以上経過している場合のみ更新
  try {
    if (currentTime - lastUpdate > 2 * 60 * 1000) {
      await db
        .update(user)
        .set({ lastActivity: new Date(currentTime).getTime() })
        .where(eq(user.id, userId));
      lastUpdateCache.set(userId, currentTime);
    }
  } catch (error) {
    console.error(`Failed to update last activity for user ${userId}:`, error);
  }
}

export async function getLastActivity(userId: string): Promise<number | null> {
  try {
    // First check the cache
    const cachedLastActivity = lastUpdateCache.get(userId);
    if (cachedLastActivity !== undefined) {
      return cachedLastActivity;
    }
    const userRecord = await db
      .select()
      .from(user)
      .where(eq(user.id, userId))
      .limit(1)
      .get();
    if (userRecord && userRecord.lastActivity) {
      lastUpdateCache.set(userId, userRecord.lastActivity);
      return userRecord.lastActivity;
    }
    return null;
  } catch (error) {
    console.error(`Failed to get last activity for user ${userId}:`, error);
    return null;
  }
}
