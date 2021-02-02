import {
  MaybeHasId,
  MaybeHasSelector,
  HasUuid,
  RectData,
  Uuid
} from '@my/shared';

export abstract class RectShape
  implements RectData, HasUuid, MaybeHasSelector, MaybeHasId {
  x: number;
  y: number;
  w: number;
  h: number;
  id: number | null = null;
  uuid: Uuid;
  private _selector: string | null = null;
  private selectorColor: string | null = null;

  set selector(newSelector: string | null) {
    this._selector = newSelector;
    if (newSelector !== null) {
      // todo pass color not as part of string
      const nameParts = newSelector.split(' ');
      if (nameParts.length > 1) this.selectorColor = nameParts[1];
      else this.selectorColor = null;
    } else {
      this.selectorColor = null;
    }
  }

  get selector(): string | null {
    return this._selector;
  }

  protected constructor(
    x: number,
    y: number,
    width: number,
    height: number,
    uuid: Uuid
  ) {
    this.x = x;
    this.y = y;
    this.w = width;
    this.h = height;
    this.uuid = uuid;
  }

  draw(context: CanvasRenderingContext2D): void {
    if (this._selector !== null && this.selectorColor !== null) {
      context.strokeStyle = 'DarkSlateGray';
      context.lineWidth = 1.5;
      context.strokeRect(this.x, this.y, this.w, this.h);

      context.fillStyle = 'DarkSlateGray';// this.selectorColor;
      context.font = '20px Arial';
      context.fillText(this._selector, this.x + this.w + 5, this.y + 20);
    }
  }

  drawSelectionRect(context: CanvasRenderingContext2D): void {
    context.strokeStyle = 'salmon'; // todo move to constants?
    context.lineWidth = 1.5; // todo move to constants?
    context.strokeRect(this.x, this.y, this.w, this.h);
  }

  drawHoverRect(context: CanvasRenderingContext2D): void {
    context.strokeStyle = 'LightSteelBlue'; // todo move to constants?
    context.lineWidth = 2.5; // todo move to constants?
    context.strokeRect(this.x, this.y, this.w, this.h);
  }

  contains(x: number, y: number): boolean {
    if (this.w < 0) {
      if (this.x < x || this.x + this.w > x) {
        return false;
      }
    } else {
      if (this.x > x || this.x + this.w < x) {
        return false;
      }
    }

    if (this.h > 0) {
      if (this.y > y || this.y + this.h < y) {
        return false;
      }
    } else {
      if (this.y < y || this.y + this.h > y) {
        return false;
      }
    }

    return true;
  }
}
