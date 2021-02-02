import { RectShape } from './rectShape';
import { Uuid } from '@my/shared';

export class ImageShape extends RectShape {
  image: CanvasImageSource;

  constructor(
    x: number,
    y: number,
    width: number,
    height: number,
    uuid: Uuid,
    image: CanvasImageSource
  ) {
    super(x, y, width, height, uuid);
    this.image = image;
  }

  draw(context: CanvasRenderingContext2D): void {
    context.drawImage(this.image, this.x, this.y, this.w, this.h);
    super.draw(context);
  }
}

export function isImageShape(rectShape: RectShape): rectShape is ImageShape {
  return (<ImageShape>rectShape).image !== undefined;
}
