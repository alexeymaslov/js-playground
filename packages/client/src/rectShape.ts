export abstract class RectShape {
  x: number;
  y: number;
  width: number;
  height: number;

  protected constructor(x: number, y: number, width: number, height: number) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
  }

  abstract draw(context: CanvasRenderingContext2D): void;

  drawSelectionRect(context: CanvasRenderingContext2D): void {
    context.strokeStyle = 'salmon'; // todo move to constants?
    context.lineWidth = 1.5; // todo move to constants?
    context.strokeRect(this.x, this.y, this.width, this.height);
  }

  contains(x: number, y: number): boolean {
    if (this.width < 0) {
      if (this.x < x || this.x + this.width > x) {
        return false;
      }
    } else {
      if (this.x > x || this.x + this.width < x) {
        return false;
      }
    }

    if (this.height > 0) {
      if (this.y > y || this.y + this.height < y) {
        return false;
      }
    } else {
      if (this.y < y || this.y + this.height > y) {
        return false;
      }
    }

    return true;
  }
}
