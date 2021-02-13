import { RectShape } from './rectShape';
import { EventCanvasPositionGetter } from './eventCanvasPositionGetter';
import { FilledShape } from './filledShape';
import {
  CanvasEventHandler,
  DefaultCanvasEventHandler
} from './canvasEventHandler';
import { color } from './index';
import { error, uuidv4 } from '@my/shared';
import { Uuid } from '@my/shared';

export class CanvasWrapper {
  private readonly canvas: HTMLCanvasElement;
  private readonly context: CanvasRenderingContext2D;
  readonly rectShapes: RectShape[] = [];
  private isValid = false;
  readonly eventCanvasPositionGetter: EventCanvasPositionGetter;
  private _canvasEventHandler: CanvasEventHandler;
  readonly onRectShapeUpdated: (rectShape: RectShape) => void;
  readonly onRectShapeCreated: (
    rectShape: RectShape,
    imageSource: string | null
  ) => void;
  readonly onRectShapeDeleted: (rectShape: RectShape) => void;
  readonly onRectShapeSelected: (rectShape: RectShape | null) => void;

  set canvasEventHandler(newHandler: CanvasEventHandler) {
    this._canvasEventHandler = newHandler;
  }

  constructor(
    canvas: HTMLCanvasElement,
    eventCanvasPositionGetter: EventCanvasPositionGetter,
    onRectShapeCreated: (rectShape: RectShape) => void,
    onRectShapeUpdated: (rectShape: RectShape) => void,
    onRectShapeDeleted: (rectShape: RectShape) => void,
    onRectShapeSelected: (rectShape: RectShape | null) => void
  ) {
    this.canvas = canvas;
    this.eventCanvasPositionGetter = eventCanvasPositionGetter;
    this.context =
      canvas.getContext('2d') ?? error('canvas should have 2d context.');
    this.onRectShapeUpdated = onRectShapeUpdated;
    this.onRectShapeCreated = onRectShapeCreated;
    this.onRectShapeDeleted = onRectShapeDeleted;
    this.onRectShapeSelected = onRectShapeSelected;

    this._canvasEventHandler = new DefaultCanvasEventHandler(this);

    canvas.oncontextmenu = function (e) { // disable context menu on right click
      e.preventDefault();
    };
    
    canvas.addEventListener('dblclick', (ev) => {
      const mousePosition = eventCanvasPositionGetter.get(ev);
      const rectShape = new FilledShape(
        mousePosition.x - 10,
        mousePosition.y - 10,
        20,
        20,
        uuidv4(),
        color
      );
      this.addRectShape(rectShape);
      this.onRectShapeCreated(rectShape, null);
    });

    canvas.addEventListener('mousedown', (ev) => this._canvasEventHandler.handleDownEvent(ev));
    canvas.addEventListener('mousemove', (ev) => this._canvasEventHandler.handleMoveEvent(ev));
    canvas.addEventListener('mouseup', (ev) => this._canvasEventHandler.handleUpEvent(ev));
    canvas.addEventListener('wheel', (ev) => this._canvasEventHandler.handleScrollEvent(ev));

    canvas.addEventListener('keydown', (ev) => this.handleKeyDownEvent(ev));

    requestAnimationFrame(() => this.draw());
  }

  getRectShapeById(id: number): RectShape | null {
    for (const rectShape of this.rectShapes) {
      if (rectShape.id === id) {
        return rectShape;
      }
    }

    return null;
  }

  getRectShapeByUuid(uuid: Uuid): RectShape | null {
    for (const rectShape of this.rectShapes) {
      if (rectShape.uuid === uuid) {
        return rectShape;
      }
    }

    return null;
  }

  invalidate(): void {
    this.isValid = false;
  }

  updateCursorStyle(style: string): void {
    this.canvas.style.cursor = style;
  }

  addRectShape(rectShape: RectShape): void {
    console.log(
      `adding rectShape={id: ${rectShape.id}, uuid: ${rectShape.uuid}}`
    );
    this.rectShapes.push(rectShape);
    this.isValid = false;
  }

  removeRectShape(rectShape: RectShape): void {
    const index = this.rectShapes.indexOf(rectShape);
    if (index > -1) {
      this.rectShapes.splice(index, 1);
    }

    this.invalidate();
  }

  private clear() {
    const rect = this.getViewRect();
    this.context.clearRect(rect.x, rect.y, rect.width, rect.height);
  }

  canvasPointToWorld(x: number, y: number): { x: number; y: number } {
    const transform = this.context.getTransform();
    return {
      x: (x - transform.e) / transform.a,
      y: (y - transform.f) / transform.d
    };
  }

  private getViewCenter(): { x: number; y: number } {
    return this.canvasPointToWorld(
      this.canvas.width / 2,
      this.canvas.height / 2
    );
  }

  private getViewRect(): {
    x: number;
    y: number;
    width: number;
    height: number;
  } {
    const topLeft = this.canvasPointToWorld(0.0, 0.0);
    const rightBottom = this.canvasPointToWorld(
      this.canvas.width,
      this.canvas.height
    );
    return {
      x: topLeft.x,
      y: topLeft.y,
      width: rightBottom.x - topLeft.x,
      height: rightBottom.y - topLeft.y
    };
  }

  draw(): void {
    requestAnimationFrame(() => this.draw());

    // it seems easier to handle window resize with this simple if
    // todo remove magic constants. should determine them based on available space for canvas element (or it's parent)
    if (
      this.canvas.width !== window.innerWidth - 20 ||
      this.canvas.height !== window.innerHeight - 150
    ) {
      this.canvas.width = window.innerWidth - 20;
      this.canvas.height = window.innerHeight - 150;
      this.invalidate();
    }

    if (this.isValid) return;

    this.clear();
    this.drawDots();
    this.drawRectShapes();
    this._canvasEventHandler.draw(this.context);
    this.isValid = true;
  }

  scale(factor: number): void {
    const prevCenter = this.getViewCenter();
    this.context.scale(factor, factor);
    const curCenter = this.getViewCenter();

    const dx = curCenter.x - prevCenter.x;
    const dy = curCenter.y - prevCenter.y;
    this.move(dx, dy);
  }
  
  move(dx: number, dy: number): void {
    this.context.translate(dx, dy);
    this.invalidate()
  }

  private drawDots(): void {
    const scale = this.context.getTransform().a;
    const step = 50;
    for (let x = (step * 3) / 4; x < this.canvas.width; x += step) {
      for (let y = (step * 3) / 4; y < this.canvas.height; y += step) {
        const pos = this.canvasPointToWorld(x, y);
        this.context.beginPath();
        this.context.arc(pos.x, pos.y, 0.5 / scale, 0, 2 * Math.PI);
        this.context.fillStyle = 'DarkSlateGray';
        this.context.fill();
      }
    }
  }

  private drawRectShapes() {
    for (const rectShape of this.rectShapes) {
      rectShape.draw(this.context);
    }
  }

  private handleKeyDownEvent(ev: KeyboardEvent) {
    if (ev.key === 'Backspace' || ev.key === 'Delete') {
      this._canvasEventHandler.handleRemoveEvent();
      ev.preventDefault();
    }
  }

  getLastRectShapeContaining(x: number, y: number): RectShape | null {
    let ret = null;
    for (const rectShape of this.rectShapes) {
      if (rectShape.contains(x, y)) {
        ret = rectShape;
      }
    }

    return ret;
  }
}
