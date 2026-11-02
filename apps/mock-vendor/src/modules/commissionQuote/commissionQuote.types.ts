export interface FieldError {
  field: string;
  message: string;
}

export interface ErrorBody {
  status: number;
  message: string;
  traceId: string;
  errors: FieldError[];
}

export interface MockResponse {
  status: number;
  body: unknown;
  headers?: Record<string, string>;
}
