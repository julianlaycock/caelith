export class AppError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly errorCode: string,
  ) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 400, 'VALIDATION_ERROR');
  }
}

export class NotFoundError extends AppError {
  constructor(entity: string, id: string) {
    super(`${entity} not found: ${id}`, 404, 'NOT_FOUND');
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409, 'CONFLICT');
  }
}

export class BusinessLogicError extends AppError {
  constructor(message: string) {
    super(message, 422, 'BUSINESS_LOGIC_ERROR');
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Not authenticated') {
    super(message, 401, 'UNAUTHORIZED');
  }
}

export class RateLimitError extends AppError {
  constructor(message: string = 'Rate limit exceeded') {
    super(message, 429, 'RATE_LIMITED');
  }
}
