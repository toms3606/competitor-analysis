import { NextResponse } from "next/server";

/**
 * These routes are called from Squarespace-hosted pages, which are a
 * different origin than the Vercel deployment — browsers enforce CORS
 * for that, even though tools like curl/reqbin don't (which is why
 * direct API testing worked fine while the live form failed with
 * "Failed to fetch"). Every response needs these headers, and OPTIONS
 * preflight requests need to be handled explicitly.
 */
export const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

/** Wraps NextResponse.json so every response — success or error —
 *  automatically carries the CORS headers. Use this instead of calling
 *  NextResponse.json directly anywhere in a route handler. */
export function corsJson(data: unknown, init?: ResponseInit) {
  return NextResponse.json(data, {
    ...init,
    headers: { ...CORS_HEADERS, ...(init?.headers ?? {}) },
  });
}

/** Standard preflight response for the OPTIONS method every route needs
 *  to export alongside its GET/POST handler. */
export function corsPreflight() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}
