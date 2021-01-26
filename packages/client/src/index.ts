import { CanvasWrapper } from './canvasWrapper.js';
import { FilledShape } from './filledShape.js';
import { EventCanvasPositionGetter } from './eventCanvasPositionGetter.js';
import { RectShape } from './rectShape.js';
import { AddEventData, AddRequestData, HasId, Shape } from '@my/shared';
import {
  uniqueNamesGenerator,
  adjectives,
  colors,
  animals
} from '../node_modules/unique-names-generator/dist/index.js';

const backendUrl = 'http://localhost:5000';

const canvas = document.getElementById('canvas');
if (!(canvas instanceof HTMLCanvasElement))
  throw new Error(
    `Element with id=canvas should be instance of HTMLCanvasElement.`
  );

const eventCanvasPositionGetter = new EventCanvasPositionGetter(canvas);
const canvasWrapper = new CanvasWrapper(canvas, eventCanvasPositionGetter);
canvasWrapper.onRectShapeCreated = async (rectShape: RectShape) => {
  const body: AddRequestData = {
    x: rectShape.x,
    y: rectShape.y,
    width: rectShape.width,
    height: rectShape.height,
    uuid: rectShape.uuid
  };
  const response = await fetch(`${backendUrl}/add`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });
  const hasId = (await response.json()) as HasId;
  rectShape.id = hasId.id;
};
canvasWrapper.onRectShapeUpdated = (rectShape: RectShape) => {
  if (rectShape.id == null) {
    console.log('Will not send resize update because rect shape is missing id');
    return;
  }
  const body: Shape = {
    x: rectShape.x,
    y: rectShape.y,
    width: rectShape.width,
    height: rectShape.height,
    id: rectShape.id
  };
  fetch(`${backendUrl}/resize`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });
};
canvasWrapper.onRectShapeDeleted = (rectShape: RectShape) => {
  if (rectShape.id == null) {
    console.log('Will not send remove update because rect shape is missing id');
    return;
  }
  const body: HasId = {
    id: rectShape.id
  };
  fetch(`${backendUrl}/remove`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });
};

const eventSource = new EventSource(`${backendUrl}/events`);
eventSource.addEventListener('add', (evt) => {
  console.log(evt);
  if (evt instanceof MessageEvent) {
    const addEventData = JSON.parse(evt.data) as AddEventData;
    const localShape = canvasWrapper.getRectShapeById(addEventData.id);
    if (localShape === null) {
      const localShapeWithUuid = canvasWrapper.getRectShapeByUuid(
        addEventData.uuid
      );
      if (localShapeWithUuid === null) {
        const filledShape = new FilledShape(
          addEventData.x,
          addEventData.y,
          addEventData.width,
          addEventData.height,
          addEventData.uuid,
          'rgba(128, 0, 128, .5)'
        );
        filledShape.id = addEventData.id;
        canvasWrapper.addRectShape(filledShape);
      }
    }
  }
});
eventSource.addEventListener('resize', (evt) => {
  console.log(evt);
  if (evt instanceof MessageEvent) {
    const shape = JSON.parse(evt.data) as Shape;
    const localShape = canvasWrapper.getRectShapeById(shape.id);
    if (localShape != null) {
      localShape.x = shape.x;
      localShape.y = shape.y;
      localShape.width = shape.width;
      localShape.height = shape.height;
      canvasWrapper.invalidate();
    }
  }
});
eventSource.addEventListener('remove', (evt) => {
  console.log(evt);
  if (evt instanceof MessageEvent) {
    const hasId = JSON.parse(evt.data) as HasId;
    const localShape = canvasWrapper.getRectShapeById(hasId.id);
    if (localShape != null) {
      canvasWrapper.removeRectShape(localShape);
    }
  }
});

let username = localStorage.getItem('username');
if (username === null) {
  username = uniqueNamesGenerator({
    dictionaries: [adjectives, colors, animals],
    separator: ' '
  });
}

const paragraph = document.getElementById(
  'hello_username_text'
) as HTMLParagraphElement;

paragraph.textContent = paragraph.textContent!.replace('username', username);
