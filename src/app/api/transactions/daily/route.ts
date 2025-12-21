import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Get date string in user's timezone (YYYY-MM-DD format)
function getDateInTimezone(date: Date, timezone: string): string {
  return date.toLocaleDateString("en-CA", { timeZone: timezone }); // en-CA gives YYYY-MM-DD format
}

// Get start of day in user's timezone, but as a UTC Date for querying
function getStartOfDayInTimezone(daysAgo: number, timezone: string): Date {
  const now = new Date();
  // Get current date string in user's timezone
  const todayStr = getDateInTimezone(now, timezone);
  // Create date from that string (will be midnight local time interpreted as UTC)
  const today = new Date(todayStr + "T00:00:00Z");
  // Adjust for timezone offset to get actual midnight in user's timezone
  const tzOffset = getTimezoneOffset(timezone);
  today.setMinutes(today.getMinutes() - tzOffset);
  // Go back the specified number of days
  today.setDate(today.getDate() - daysAgo);
  return today;
}

// Get timezone offset in minutes (positive for west of UTC, negative for east)
function getTimezoneOffset(timezone: string): number {
  const now = new Date();
  const utcDate = new Date(now.toLocaleString("en-US", { timeZone: "UTC" }));
  const tzDate = new Date(now.toLocaleString("en-US", { timeZone: timezone }));
  return (utcDate.getTime() - tzDate.getTime()) / 60000;
}

export async function GET(request: NextRequest) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const days = Math.min(parseInt(searchParams.get("days") ?? "30", 10), 90);
  const timezone = searchParams.get("timezone") ?? "UTC";

  // Calculate start date in user's timezone
  const startDate = getStartOfDayInTimezone(days - 1, timezone);

  const transactions = await prisma.transaction.findMany({
    where: {
      userId: session.user.id,
      createdAt: { gte: startDate },
    },
    select: {
      type: true,
      amount: true,
      createdAt: true,
    },
  });

  // Initialize all days with zero values using user's timezone
  const dailyMap = new Map<string, { earnings: number; spending: number }>();
  const now = new Date();

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    const dateKey = getDateInTimezone(date, timezone);
    dailyMap.set(dateKey, { earnings: 0, spending: 0 });
  }

  // Aggregate transactions by day in user's timezone
  transactions.forEach((tx) => {
    const dateKey = getDateInTimezone(tx.createdAt, timezone);
    const existing = dailyMap.get(dateKey);
    if (!existing) return;

    if (tx.type === "EARNING") {
      existing.earnings += tx.amount;
    } else {
      existing.spending += tx.amount; // amount is already negative for SPENDING
    }
  });

  // Convert to array sorted by date
  const dailyData = Array.from(dailyMap.entries())
    .map(([date, data]) => ({
      date,
      earnings: data.earnings,
      spending: data.spending,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return NextResponse.json({ dailyData });
}
