import { AddEventData, MessageEventData, SelectEventData } from '@my/shared';

export type State = {
  addEvents: AddEventData[];
  selectEvents: SelectEventData[];
  messageEvents: MessageEventData[];
  authorInfo: { color: string; hue: number; author: string }[];
};

export function isState(u: unknown): u is State {
  if (typeof u === 'object') {
    const o = u as Record<string, unknown>;
    return (
      o.addEvents !== undefined &&
      o.addEvents instanceof Array &&
      o.selectEvents !== undefined &&
      o.selectEvents instanceof Array &&
      o.messageEvents !== undefined &&
      o.messageEvents instanceof Array &&
      o.authorInfo !== undefined &&
      o.authorInfo instanceof Array
    );
  }

  return false;
}
