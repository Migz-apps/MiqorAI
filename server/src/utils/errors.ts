export class AppError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode = 400,
    public details?: unknown,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export function notFound(message = "Not found") {
  return new AppError("NOT_FOUND", message, 404);
}

export function unauthorized(message = "Unauthorized", code = "UNAUTHORIZED") {
  return new AppError(code, message, 401);
}

export function forbidden(message = "Forbidden") {
  return new AppError("FORBIDDEN", message, 403);
}

export function badRequest(message: string, details?: unknown) {
  return new AppError("BAD_REQUEST", message, 400, details);
}
