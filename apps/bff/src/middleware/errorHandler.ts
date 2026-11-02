import type { ErrorRequestHandler, RequestHandler } from "express";
import { AppError } from "../errors";

export const notFoundHandler: RequestHandler = (_req, _res, next) => {
  next(new AppError("NOT_FOUND"));
};

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  let appError: AppError;

  if (err instanceof AppError) {
    appError = err;
  } else if (err instanceof SyntaxError && "body" in err) {
    // express.json() failed to parse the body
    appError = new AppError("VALIDATION_ERROR", [
      { field: "body", message: "Invalid JSON" },
    ]);
  } else {
    console.error("unexpected error", err instanceof Error ? err.message : err);
    appError = new AppError("INTERNAL_ERROR");
  }

  res.status(appError.status).json(appError.toBody());
};
