export class ServerSentEvent {
  readonly data: string;
  readonly id: string;
  readonly event: string;

  constructor(data: string, id: string, event: string) {
    this.data = data;
    this.id = id;
    this.event = event;
  }

  toString(): string {
    return `data: ${this.data}\nid: ${this.id}\nevent: ${this.event}\n\n`;
  }
}
