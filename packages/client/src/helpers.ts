import { Uuid } from '@my/shared';

export function error<T>(message: string): T {
  throw new Error(message);
}

export function uuidv4(): Uuid {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0,
      v = c == 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
