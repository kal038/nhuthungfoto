export class AppError extends Error {
  constructor(
    public message: string,
    public status: number,
  ) {
    super(message)
  }
}

export class BadRequestError extends AppError {
  constructor(message = 'Bad Request') {
    super(message, 400)
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') {
    super(message, 401)
  }
}
