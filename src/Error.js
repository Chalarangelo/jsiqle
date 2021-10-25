export class NameError extends Error {
  constructor(message) {
    super(message);
    this.name = 'NameError';
  }
}

export class ValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ValidationError';
  }
}
