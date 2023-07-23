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

export class DuplicationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'DuplicationError';
  }
}

export class ExperimentalAPIUsageError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ExperimentalAPIUsageError';
  }
}
