import type { ApiErrorOptions } from "./types.js";

export class WalletsApiError extends Error {
  readonly status: number;
  readonly statusText: string | undefined;
  readonly body: unknown;
  readonly headers: Headers | undefined;

  constructor(message: string, options: ApiErrorOptions) {
    super(message);
    this.name = "WalletsApiError";
    this.status = options.status;
    this.statusText = options.statusText;
    this.body = options.body;
    this.headers = options.headers;
  }
}
