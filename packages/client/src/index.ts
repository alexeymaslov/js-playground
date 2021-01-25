import { CanvasWrapper } from './canvasWrapper.js';
import { FilledShape } from './filledShape.js';
import { EventCanvasPositionGetter } from './eventCanvasPositionGetter.js';
import { RectShape } from './rectShape.js';

const backendUrl = 'http://localhost:5000';

const canvas = document.getElementById('canvas');
if (!(canvas instanceof HTMLCanvasElement))
  throw new TypeError(
    `Element with id=canvas should be instance of HTMLCanvasElement.`
  );
const eventCanvasPositionGetter = new EventCanvasPositionGetter(canvas);
const canvasWrapper = new CanvasWrapper(canvas, eventCanvasPositionGetter);
canvasWrapper.onRectShapeUpdated = (rectShape: RectShape) => {
  fetch(`${backendUrl}/update`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(rectShape)
  });
};

// todo learn how to setup monorepository with lerna to reference client
type Shape = ShapeGeometry & HasId;
type HasId = { id: number };
type ShapeGeometry = {
  x: number;
  y: number;
  width: number;
  height: number;
};

const eventSource = new EventSource(`${backendUrl}/streaming`);
eventSource.addEventListener('add', (evt) => {
  if (evt instanceof MessageEvent) {
    const shape = evt.data as Shape;
    canvasWrapper.addRectShape(
      new FilledShape(shape.x, shape.y, shape.width, shape.height, '#F0F00F')
    );
  }
});
eventSource.addEventListener('resize', (evt) => {
  if (evt instanceof MessageEvent) {
    const shape = evt.data as Shape;
    // canvasWrapper.
  }
});
eventSource.addEventListener('remove', (evt) => {
  if (evt instanceof MessageEvent) {
    const hasId = evt.data as HasId;
  }
});

// canvasWrapper.addRectShape(new FilledShape(10, 10, 50, 20, '#FF0000'));
// canvasWrapper.addRectShape(new FilledShape(100, 10, 50, 20, '#FFFF00'));
// canvasWrapper.addRectShape(new FilledShape(10, 100, 50, 20, '#FF00FF'));
// canvasWrapper.addRectShape(new ImageShape(100, 100, 100, 100))
