import { RectShape } from './rectShape.js';

export class ImageShape extends RectShape {
  image: CanvasImageSource;

  constructor(
    x: number,
    y: number,
    width: number,
    height: number,
    image: CanvasImageSource
  ) {
    super(x, y, width, height);
    this.image = image;
  }

  draw(context: CanvasRenderingContext2D): void {
    context.drawImage(this.image, this.x, this.y, this.width, this.height);
  }
}
