import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  ActivityType,
  MeasurementUnit,
  ACTIVITY_CONFIG,
  calculateActivityValue,
} from "@/config/activities";

export async function POST(request: NextRequest) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { activityType, amount, unit } = body as {
    activityType: ActivityType;
    amount: number;
    unit: MeasurementUnit;
  };

  if (!activityType || !ACTIVITY_CONFIG[activityType]) {
    return NextResponse.json(
      { error: "Invalid activity type" },
      { status: 400 }
    );
  }

  if (typeof amount !== "number" || amount <= 0) {
    return NextResponse.json(
      { error: "Amount must be a positive number" },
      { status: 400 }
    );
  }

  const config = ACTIVITY_CONFIG[activityType];
  if (!config.allowedUnits.includes(unit)) {
    return NextResponse.json(
      { error: `Invalid unit for ${activityType}. Allowed: ${config.allowedUnits.join(", ")}` },
      { status: 400 }
    );
  }

  const credits = calculateActivityValue(activityType, amount, unit);
  const description = `${config.name}: ${amount} ${unit}`;

  const [transaction, user] = await prisma.$transaction([
    prisma.transaction.create({
      data: {
        userId: session.user.id,
        type: "EARNING",
        activityType,
        amount: credits,
        description,
        metadata: { originalAmount: amount, unit },
      },
    }),
    prisma.user.update({
      where: { id: session.user.id },
      data: { balance: { increment: credits } },
      select: { balance: true },
    }),
  ]);

  return NextResponse.json({
    transaction,
    newBalance: user.balance,
    creditsEarned: credits,
  });
}

export async function GET() {
  return NextResponse.json(ACTIVITY_CONFIG);
}
