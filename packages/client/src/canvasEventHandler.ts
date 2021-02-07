import { CanvasWrapper } from './canvasWrapper';
import { RectShape } from './rectShape';
import { FilledShape } from './filledShape';

export interface CanvasEventHandler {
  handleDownEvent(x: number, y: number): void;

  handleMoveEvent(x: number, y: number): void;

  handleUpEvent(): void;
  
  handleScrollEvent(e: WheelEvent): void;

  draw(context: CanvasRenderingContext2D): void;

  handleRemoveEvent(): void;
}

export abstract class CanvasEventHandlerBase implements CanvasEventHandler {
  protected rectShapeUnderMouse: RectShape | null = null;
  protected readonly canvasWrapper: CanvasWrapper;

  protected constructor(canvasWrapper: CanvasWrapper) {
    this.canvasWrapper = canvasWrapper;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  handleDownEvent(x: number, y: number): void {
    // do nothing
  }

  handleMoveEvent(x: number, y: number): void {
    const rectShape = this.canvasWrapper.getLastRectShapeContaining(x, y);
    this.updateRectShapeUnderMouse(rectShape);
  }

  protected updateRectShapeUnderMouse(rectShape: RectShape | null): void {
    if (rectShape === null) {
      if (this.rectShapeUnderMouse !== null) {
        this.rectShapeUnderMouse = null;
        this.canvasWrapper.invalidate();
      }
    } else {
      if (this.rectShapeUnderMouse?.id !== rectShape.id) {
        this.rectShapeUnderMouse = rectShape;
        this.canvasWrapper.invalidate();
      }
    }
  }

  handleUpEvent(): void {
    // do nothing
  }

  handleScrollEvent(e: WheelEvent): void {
    this.canvasWrapper.scale(1.0 - e.deltaY * 0.05);
    this.canvasWrapper.invalidate()
  }

  draw(context: CanvasRenderingContext2D): void {
    if (this.rectShapeUnderMouse) {
      this.rectShapeUnderMouse.drawHoverRect(context);
    }
    // this.drawResizeHandles(context);
  }

  handleRemoveEvent(): void {
    // do nothing
  }
}

export class DefaultCanvasEventHandler extends CanvasEventHandlerBase {
  constructor(canvasWrapper: CanvasWrapper) {
    super(canvasWrapper);
    this.canvasWrapper.onRectShapeSelected(null);
  }

  handleDownEvent(x: number, y: number): void {
    const rectShape = this.canvasWrapper.getLastRectShapeContaining(x, y);
    if (rectShape !== null) {
      this.canvasWrapper.canvasEventHandler = new DragCanvasEventHandler(
        this.canvasWrapper,
        rectShape,
        x,
        y
      );
    }
  }
}

export class SelectedCanvasEventHandler extends CanvasEventHandlerBase {
  private readonly resizeHandles: readonly FilledShape[];
  private readonly resizeBoxSize: number = 4;
  protected readonly selectedRectShape: RectShape;
  private selectedResizeHandleIndex: number | null = null;

  constructor(canvasWrapper: CanvasWrapper, selectedRectShape: RectShape) {
    super(canvasWrapper);
    this.selectedRectShape = selectedRectShape;

    const resizeHandles = [];
    for (let i = 0; i < 8; i++) {
      resizeHandles.push(
        new FilledShape(
          0,
          0,
          this.resizeBoxSize,
          this.resizeBoxSize,
          '',
          'tomato'
        )
      );
    }
    this.resizeHandles = resizeHandles;
    this.updateResizeHandlesPosition();
    this.canvasWrapper.invalidate();
    this.canvasWrapper.onRectShapeSelected(this.selectedRectShape);
  }

  handleDownEvent(x: number, y: number): void {
    if (this.selectedResizeHandleIndex !== null) {
      this.canvasWrapper.canvasEventHandler = new ResizeCanvasEventHandler(
        this.canvasWrapper,
        this.selectedRectShape,
        this.selectedResizeHandleIndex
      );
    } else {
      const rectShape = this.canvasWrapper.getLastRectShapeContaining(x, y);
      if (rectShape !== null) {
        this.canvasWrapper.canvasEventHandler = new DragCanvasEventHandler(
          this.canvasWrapper,
          rectShape,
          x,
          y
        );
      } else {
        this.canvasWrapper.invalidate();
        this.canvasWrapper.canvasEventHandler = new DefaultCanvasEventHandler(
          this.canvasWrapper
        );
      }
    }
  }

  handleMoveEvent(x: number, y: number): void {
    const rectShape = this.canvasWrapper.getLastRectShapeContaining(x, y);
    this.updateRectShapeUnderMouse(rectShape);

    for (let i = 0; i < this.resizeHandles.length; i++) {
      const resizeHandle = this.resizeHandles[i];
      if (resizeHandle.contains(x, y)) {
        this.selectedResizeHandleIndex = i;
        this.updateCanvasCursorStyle(i);
        return;
      }
    }

    this.selectedResizeHandleIndex = null;
    if (rectShape !== null && rectShape.id === this.selectedRectShape.id) {
      this.canvasWrapper.updateCursorStyle('move');
    } else {
      this.canvasWrapper.updateCursorStyle('auto');
    }
  }

  private updateCanvasCursorStyle(i: number) {
    switch (i) {
      case 0:
        this.canvasWrapper.updateCursorStyle('nw-resize');
        break;
      case 1:
        this.canvasWrapper.updateCursorStyle('n-resize');
        break;
      case 2:
        this.canvasWrapper.updateCursorStyle('ne-resize');
        break;
      case 3:
        this.canvasWrapper.updateCursorStyle('w-resize');
        break;
      case 4:
        this.canvasWrapper.updateCursorStyle('e-resize');
        break;
      case 5:
        this.canvasWrapper.updateCursorStyle('sw-resize');
        break;
      case 6:
        this.canvasWrapper.updateCursorStyle('s-resize');
        break;
      case 7:
        this.canvasWrapper.updateCursorStyle('se-resize');
        break;
    }
  }

  draw(context: CanvasRenderingContext2D): void {
    if (this.selectedRectShape.id !== this.rectShapeUnderMouse?.id) {
      super.draw(context);
    }
    this.selectedRectShape.drawSelectionRect(context);
    this.drawResizeHandles(context);
  }

  private drawResizeHandles(context: CanvasRenderingContext2D): void {
    for (const resizeHandle of this.resizeHandles) {
      resizeHandle.draw(context);
    }
  }

  protected updateResizeHandlesPosition(): void {
    const x = this.selectedRectShape.x;
    const y = this.selectedRectShape.y;
    const halvedSize = this.resizeBoxSize / 2;
    const sW = this.selectedRectShape.w;
    const sH = this.selectedRectShape.h;
    const halvedSW = sW / 2;
    const halvedSH = sH / 2;
    this.resizeHandles[0].x = x - halvedSize;
    this.resizeHandles[0].y = y - halvedSize;
    this.resizeHandles[1].x = x - halvedSize + halvedSW;
    this.resizeHandles[1].y = y - halvedSize;
    this.resizeHandles[2].x = x - halvedSize + sW;
    this.resizeHandles[2].y = y - halvedSize;
    this.resizeHandles[3].x = x - halvedSize;
    this.resizeHandles[3].y = y - halvedSize + halvedSH;
    this.resizeHandles[4].x = x - halvedSize + sW;
    this.resizeHandles[4].y = y - halvedSize + halvedSH;
    this.resizeHandles[5].x = x - halvedSize;
    this.resizeHandles[5].y = y - halvedSize + sH;
    this.resizeHandles[6].x = x - halvedSize + halvedSW;
    this.resizeHandles[6].y = y - halvedSize + sH;
    this.resizeHandles[7].x = x - halvedSize + sW;
    this.resizeHandles[7].y = y - halvedSize + sH;
  }

  handleRemoveEvent(): void {
    this.canvasWrapper.removeRectShape(this.selectedRectShape);
    this.canvasWrapper.onRectShapeDeleted?.(this.selectedRectShape);
    this.canvasWrapper.canvasEventHandler = new DefaultCanvasEventHandler(
      this.canvasWrapper
    );
  }
}

export class DragCanvasEventHandler extends SelectedCanvasEventHandler {
  private readonly dragOffsetX: number;
  private readonly dragOffsetY: number;

  constructor(
    canvasWrapper: CanvasWrapper,
    selectedRectShape: RectShape,
    x: number,
    y: number
  ) {
    super(canvasWrapper, selectedRectShape);
    this.canvasWrapper.updateCursorStyle('move');
    this.dragOffsetX = x - selectedRectShape.x;
    this.dragOffsetY = y - selectedRectShape.y;
  }

  handleMoveEvent(x: number, y: number): void {
    this.selectedRectShape.x = x - this.dragOffsetX;
    this.selectedRectShape.y = y - this.dragOffsetY;
    this.updateResizeHandlesPosition();
    this.canvasWrapper.invalidate();
  }

  handleUpEvent(): void {
    this.canvasWrapper.onRectShapeUpdated?.(this.selectedRectShape);
    this.canvasWrapper.canvasEventHandler = new SelectedCanvasEventHandler(
      this.canvasWrapper,
      this.selectedRectShape
    );
  }
}

export class ResizeCanvasEventHandler extends SelectedCanvasEventHandler {
  private readonly resizeHandleIndex: number;

  constructor(
    canvasWrapper: CanvasWrapper,
    selectedRectShape: RectShape,
    selectedResizeHandleIndex: number
  ) {
    super(canvasWrapper, selectedRectShape);
    this.resizeHandleIndex = selectedResizeHandleIndex;
  }

  handleMoveEvent(x: number, y: number): void {
    this.updateSelectedRectShape(x, y);
    this.updateResizeHandlesPosition();
    this.canvasWrapper.invalidate();
  }

  handleUpEvent(): void {
    this.canvasWrapper.onRectShapeUpdated(this.selectedRectShape);
    this.canvasWrapper.updateCursorStyle('auto');
    this.canvasWrapper.canvasEventHandler = new SelectedCanvasEventHandler(
      this.canvasWrapper,
      this.selectedRectShape
    );
  }

  private updateSelectedRectShape(x: number, y: number) {
    const oldx = this.selectedRectShape.x;
    const oldy = this.selectedRectShape.y;
    switch (this.resizeHandleIndex) {
      case 0:
        this.selectedRectShape.x = x;
        this.selectedRectShape.y = y;
        this.selectedRectShape.w += oldx - x;
        this.selectedRectShape.h += oldy - y;
        break;
      case 1:
        this.selectedRectShape.y = y;
        this.selectedRectShape.h += oldy - y;
        break;
      case 2:
        this.selectedRectShape.y = y;
        this.selectedRectShape.w = x - oldx;
        this.selectedRectShape.h += oldy - y;
        break;
      case 3:
        this.selectedRectShape.x = x;
        this.selectedRectShape.w += oldx - x;
        break;
      case 4:
        this.selectedRectShape.w = x - oldx;
        break;
      case 5:
        this.selectedRectShape.x = x;
        this.selectedRectShape.w += oldx - x;
        this.selectedRectShape.h = y - oldy;
        break;
      case 6:
        this.selectedRectShape.h = y - oldy;
        break;
      case 7:
        this.selectedRectShape.w = x - oldx;
        this.selectedRectShape.h = y - oldy;
        break;
    }
  }
}
