declare module 'express' {
  export type Request = any;
  export type Response = any;
  export type NextFunction = any;
  export type RequestHandler = any;
  export interface Router {
    use: (...args: any[]) => Router;
    get: (...args: any[]) => Router;
    post: (...args: any[]) => Router;
    put: (...args: any[]) => Router;
    patch: (...args: any[]) => Router;
    delete: (...args: any[]) => Router;
  }
  export function Router(options?: any): Router;
  const exp: any;
  export default exp;
}

declare module 'node:test' {
  const test: any;
  export default test;
  export const describe: any;
  export const it: any;
}

declare module 'node:assert/strict' {
  const assert: any;
  export default assert;
}

declare module 'node:fs' {
  const fs: any;
  export default fs;
}

declare module 'node:path' {
  const path: any;
  export default path;
}

declare module 'node:url' {
  export const fileURLToPath: any;
}

declare module 'node:crypto' {
  export const randomUUID: () => string;
  export const randomBytes: (size: number) => { toString(enc: string): string };
  export const createHash: any;
  export const createHmac: any;
  export const timingSafeEqual: any;
}

declare module 'http' {
  export function createServer(handler: any): any;
}

declare const __dirname: string;
declare const Buffer: any;
declare const process: {
  env: Record<string, string | undefined>;
  argv: string[];
  exit(code?: number): void;
};
