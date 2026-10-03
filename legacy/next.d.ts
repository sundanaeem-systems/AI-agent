/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Ambient Type Declarations for Next.js Server Types
 * Provides complete typings for NextRequest, NextResponse, and App Router Route Handlers.
 */

declare module 'next/server' {
  export class NextRequest extends Request {
    readonly nextUrl: URL;
    readonly cookies: Map<string, string>;
  }

  export class NextResponse<Body = any> extends Response {
    static json<T = any>(body: T, init?: ResponseInit): NextResponse<T>;
    static redirect(url: string | URL, status?: number): NextResponse;
    static next(init?: ResponseInit): NextResponse;
  }
}
