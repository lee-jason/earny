import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Platform, SPENDING_CONFIG, calculateSpendingCost } from "@/config/spending";
import { corsResponse, corsOptionsResponse } from "@/lib/cors";

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  const session = await auth();

  if (!session?.user?.id) {
    return corsResponse(
      NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
      origin
    );
  }

  const body = await request.json();
  const { platform, durationMinutes, videoUrl, videoTitle, waived } = body as {
    platform: Platform;
    durationMinutes: number;
    videoUrl?: string;
    videoTitle?: string;
    waived?: boolean;
  };

  if (!platform || !SPENDING_CONFIG[platform]) {
    return corsResponse(
      NextResponse.json({ error: "Invalid platform" }, { status: 400 }),
      origin
    );
  }

  if (typeof durationMinutes !== "number" || durationMinutes <= 0) {
    return corsResponse(
      NextResponse.json(
        { error: "Duration must be a positive number" },
        { status: 400 }
      ),
      origin
    );
  }

  const cost = calculateSpendingCost(platform, durationMinutes);
  const isWaived = waived === true;

  // Skip balance check if waived
  if (!isWaived) {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { balance: true },
    });

    if (!user || user.balance < cost) {
      return corsResponse(
        NextResponse.json(
          {
            error: "Insufficient balance",
            required: cost,
            available: user?.balance ?? 0,
          },
          { status: 402 }
        ),
        origin
      );
    }
  }

  const config = SPENDING_CONFIG[platform];
  const description = videoTitle
    ? `${config.name}: ${videoTitle} (${durationMinutes} min)${isWaived ? " [waived]" : ""}`
    : `${config.name}: ${durationMinutes} minutes${isWaived ? " [waived]" : ""}`;

  if (isWaived) {
    // Waived: log transaction but don't deduct balance
    const transaction = await prisma.transaction.create({
      data: {
        userId: session.user.id,
        type: "SPENDING",
        activityType: platform,
        amount: -cost,
        description,
        metadata: { platform, durationMinutes, videoUrl, videoTitle },
        waived: true,
      },
    });

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { balance: true },
    });

    return corsResponse(
      NextResponse.json({
        transaction,
        newBalance: user?.balance ?? 0,
        creditsSpent: 0,
        waived: true,
      }),
      origin
    );
  }

  // Normal spending: deduct balance
  const [transaction, updatedUser] = await prisma.$transaction([
    prisma.transaction.create({
      data: {
        userId: session.user.id,
        type: "SPENDING",
        activityType: platform,
        amount: -cost,
        description,
        metadata: { platform, durationMinutes, videoUrl, videoTitle },
        waived: false,
      },
    }),
    prisma.user.update({
      where: { id: session.user.id },
      data: { balance: { decrement: cost } },
      select: { balance: true },
    }),
  ]);

  return corsResponse(
    NextResponse.json({
      transaction,
      newBalance: updatedUser.balance,
      creditsSpent: cost,
      waived: false,
    }),
    origin
  );
}

export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get("origin");
  return corsOptionsResponse(origin);
}
