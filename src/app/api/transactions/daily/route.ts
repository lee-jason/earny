import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const days = Math.min(parseInt(searchParams.get("days") ?? "30", 10), 90);

  // Calculate start date (midnight of `days` ago)
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days + 1);
  startDate.setHours(0, 0, 0, 0);

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

  // Initialize all days with zero values
  const dailyMap = new Map<string, { earnings: number; spending: number }>();
  for (let i = 0; i < days; i++) {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + i);
    const dateKey = date.toISOString().split("T")[0];
    dailyMap.set(dateKey, { earnings: 0, spending: 0 });
  }

  // Aggregate transactions by day
  transactions.forEach((tx) => {
    const dateKey = tx.createdAt.toISOString().split("T")[0];
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
