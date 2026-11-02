export type ErrorCode =
  | "VALIDATION_ERROR"
  | "UPSTREAM_TIMEOUT"
  | "RATE_LIMITED"
  | "UPSTREAM_UNAVAILABLE"
  | "NOT_FOUND"
  | "INTERNAL_ERROR";

export interface FieldError {
  field: string;
  message: string;
}

export interface ErrorBody {
  code: ErrorCode;
  message: string;
  errors: FieldError[];
}

const STATUS: Record<ErrorCode, number> = {
  VALIDATION_ERROR: 400,
  UPSTREAM_TIMEOUT: 504,
  RATE_LIMITED: 429,
  UPSTREAM_UNAVAILABLE: 502,
  NOT_FOUND: 404,
  INTERNAL_ERROR: 500,
};

const MESSAGES: Record<ErrorCode, string> = {
  VALIDATION_ERROR: "The request is invalid. Please check the highlighted fields.",
  UPSTREAM_TIMEOUT: "The quote service took too long. Please try again.",
  RATE_LIMITED: "Too many requests. Please wait a moment and try again.",
  UPSTREAM_UNAVAILABLE: "The quote service is unavailable. Please try again later.",
  NOT_FOUND: "The requested resource was not found.",
  INTERNAL_ERROR: "Something went wrong. Please try again later.",
};

export class AppError extends Error {
  readonly status: number;

  constructor(
    readonly code: ErrorCode,
    readonly errors: FieldError[] = [],
  ) {
    super(code);
    this.status = STATUS[code];
  }

  toBody(): ErrorBody {
    return { code: this.code, message: MESSAGES[this.code], errors: this.errors };
  }
}
