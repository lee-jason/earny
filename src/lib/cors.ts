import { NextResponse } from "next/server";

const ALLOWED_ORIGINS = [
  "chrome-extension://", // Chrome extensions
  "moz-extension://", // Firefox extensions
  "http://localhost:3000", // Local development
];

export function getCorsHeaders(origin: string | null): Record<string, string> {
  // Allow extension origins
  const isAllowed = origin && ALLOWED_ORIGINS.some((allowed) => origin.startsWith(allowed));

  return {
    "Access-Control-Allow-Origin": isAllowed ? origin : "https://earny-red.vercel.app",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Credentials": "true",
  };
}

export function corsResponse(response: NextResponse, origin: string | null): NextResponse {
  const headers = getCorsHeaders(origin);
  Object.entries(headers).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  return response;
}

export function corsOptionsResponse(origin: string | null): NextResponse {
  return new NextResponse(null, {
    status: 200,
    headers: getCorsHeaders(origin),
  });
}
