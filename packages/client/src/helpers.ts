export function error<T>(message: string): T {
  throw new Error(message);
}
