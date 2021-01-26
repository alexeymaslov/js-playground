import { error, uuidv4 } from './helpers.js';
import { RectShape } from './rectShape.js';
import { EventCanvasPositionGetter } from './eventCanvasPositionGetter.js';
import { FilledShape } from './filledShape.js';
import {
  CanvasEventHandler,
  DefaultCanvasEventHandler
} from './canvasEventHandler.js';
import { Uuid } from '@my/shared';

export class CanvasWrapper {
  private readonly canvas: HTMLCanvasElement;
  private readonly context: CanvasRenderingContext2D;
  private readonly rectShapes: RectShape[] = [];
  private isValid = false;
  private readonly eventCanvasPositionGetter: EventCanvasPositionGetter;
  private _canvasEventHandler: CanvasEventHandler = new DefaultCanvasEventHandler(
    this
  );
  onRectShapeUpdated: ((rectShape: RectShape) => void) | null = null;
  onRectShapeCreated: ((rectShape: RectShape) => void) | null = null;
  onRectShapeDeleted: ((rectShape: RectShape) => void) | null = null;

  set canvasEventHandler(newHandler: CanvasEventHandler) {
    this._canvasEventHandler = newHandler;
  }

  constructor(
    canvas: HTMLCanvasElement,
    eventCanvasPositionGetter: EventCanvasPositionGetter
  ) {
    this.canvas = canvas;
    this.eventCanvasPositionGetter = eventCanvasPositionGetter;
    this.context =
      canvas.getContext('2d') ?? error('canvas should have 2d context.');

    canvas.addEventListener('dblclick', (ev) => {
      const mousePosition = eventCanvasPositionGetter.get(ev);
      const rectShape = new FilledShape(
        mousePosition.x - 10,
        mousePosition.y - 10,
        20,
        20,
        uuidv4(),
        'rgba(128, 0, 128, .5)'
      );
      this.addRectShape(rectShape);
      this.onRectShapeCreated?.(rectShape);
    });

    canvas.addEventListener('mousedown', (ev) => this.handleDownEvent(ev));
    canvas.addEventListener('mousemove', (ev) => this.handleMoveEvent(ev));
    canvas.addEventListener('mouseup', () => this.handleUpEvent());

    canvas.addEventListener('keydown', (ev) => this.handleKeyDownEvent(ev));

    requestAnimationFrame(() => this.draw());
    // setInterval(() => this.draw(), 30);
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
    this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
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
    this.drawRectShapes();
    this._canvasEventHandler.draw(this.context);
    this.isValid = true;
  }

  private drawRectShapes() {
    for (const rectShape of this.rectShapes) {
      if (this.isInCanvasBounds(rectShape)) {
        rectShape.draw(this.context);
      }
    }
  }

  private isInCanvasBounds(rectShape: RectShape): boolean {
    return (
      rectShape.x >= 0 &&
      rectShape.x <= this.canvas.width &&
      rectShape.y >= 0 &&
      rectShape.y <= this.canvas.height
    );
  }

  private handleDownEvent(ev: MouseEvent) {
    const mousePosition = this.eventCanvasPositionGetter.get(ev);
    this._canvasEventHandler.handleDownEvent(mousePosition.x, mousePosition.y);
  }

  private handleMoveEvent(ev: MouseEvent) {
    const mousePosition = this.eventCanvasPositionGetter.get(ev);
    this._canvasEventHandler.handleMoveEvent(mousePosition.x, mousePosition.y);
  }

  private handleUpEvent() {
    this._canvasEventHandler.handleUpEvent();
  }

  private handleKeyDownEvent(ev: KeyboardEvent) {
    if (ev.key === 'Backspace' || ev.key === 'Delete') {
      this._canvasEventHandler.handleRemoveEvent();
      ev.preventDefault();
    }
  }

  getFirstRectShapeContaining(x: number, y: number): RectShape | null {
    for (const rectShape of this.rectShapes) {
      if (rectShape.contains(x, y)) {
        return rectShape;
      }
    }

    return null;
  }
}
