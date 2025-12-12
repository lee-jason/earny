import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Platform, SPENDING_CONFIG, calculateSpendingCost } from "@/config/spending";

export async function POST(request: NextRequest) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { platform, durationMinutes, videoUrl, videoTitle } = body as {
    platform: Platform;
    durationMinutes: number;
    videoUrl?: string;
    videoTitle?: string;
  };

  if (!platform || !SPENDING_CONFIG[platform]) {
    return NextResponse.json({ error: "Invalid platform" }, { status: 400 });
  }

  if (typeof durationMinutes !== "number" || durationMinutes <= 0) {
    return NextResponse.json(
      { error: "Duration must be a positive number" },
      { status: 400 }
    );
  }

  const cost = calculateSpendingCost(platform, durationMinutes);

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { balance: true },
  });

  if (!user || user.balance < cost) {
    return NextResponse.json(
      {
        error: "Insufficient balance",
        required: cost,
        available: user?.balance ?? 0,
      },
      { status: 402 }
    );
  }

  const config = SPENDING_CONFIG[platform];
  const description = videoTitle
    ? `${config.name}: ${videoTitle} (${durationMinutes} min)`
    : `${config.name}: ${durationMinutes} minutes`;

  const [transaction, updatedUser] = await prisma.$transaction([
    prisma.transaction.create({
      data: {
        userId: session.user.id,
        type: "SPENDING",
        activityType: platform,
        amount: -cost,
        description,
        metadata: { platform, durationMinutes, videoUrl, videoTitle },
      },
    }),
    prisma.user.update({
      where: { id: session.user.id },
      data: { balance: { decrement: cost } },
      select: { balance: true },
    }),
  ]);

  return NextResponse.json({
    transaction,
    newBalance: updatedUser.balance,
    creditsSpent: cost,
  });
}
