import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { corsResponse, corsOptionsResponse } from "@/lib/cors";

export async function GET(request: NextRequest) {
  const origin = request.headers.get("origin");
  const session = await auth();

  if (!session?.user?.id) {
    return corsResponse(
      NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
      origin
    );
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { balance: true },
  });

  if (!user) {
    return corsResponse(
      NextResponse.json({ error: "User not found" }, { status: 404 }),
      origin
    );
  }

  return corsResponse(
    NextResponse.json({ balance: user.balance }),
    origin
  );
}

export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get("origin");
  return corsOptionsResponse(origin);
}
