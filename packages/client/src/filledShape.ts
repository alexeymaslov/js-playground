import { RectShape } from './rectShape.js';

export class FilledShape extends RectShape {
  fillStyle: string;

  constructor(
    x: number,
    y: number,
    width: number,
    height: number,
    fillStyle: string
  ) {
    super(x, y, width, height);
    this.fillStyle = fillStyle;
  }

  draw(context: CanvasRenderingContext2D): void {
    context.fillStyle = this.fillStyle;
    context.fillRect(this.x, this.y, this.width, this.height);
  }
}
