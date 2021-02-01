import { RectShape } from './rectShape';
import { Uuid } from '@my/shared';

export class FilledShape extends RectShape {
  fillStyle: string;

  constructor(
    x: number,
    y: number,
    width: number,
    height: number,
    uuid: Uuid,
    fillStyle: string
  ) {
    super(x, y, width, height, uuid);
    this.fillStyle = fillStyle;
  }

  draw(context: CanvasRenderingContext2D): void {
    context.fillStyle = this.fillStyle;
    context.fillRect(this.x, this.y, this.width, this.height);
  }
}
