export { };

declare global {
  namespace Express {
    export interface Response {
      success<T>(data: T, code?: number): void;
      error(error: string, code?: number): void;
    }
  }
}
