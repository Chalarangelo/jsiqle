export class NameError extends Error {
  constructor(message) {
    super(message);
    this.name = 'NameError';
  }
}
