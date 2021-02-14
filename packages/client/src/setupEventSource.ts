import { ImageShape } from './imageShape';
import { FilledShape } from './filledShape';
import {
  AddEventData,
  isFilledRectData,
  isImageRectData,
  RemoveEventData,
  ResizeEventData,
  SelectEventData
} from '@my/shared';
import { CanvasWrapper } from './canvasWrapper';

let lastEventId: string | null = null;

export function setupEventSource(
  backendUrl: string,
  canvasWrapper: CanvasWrapper,
  username: string
): void {
  //asdasd
  const url =
    lastEventId !== null
      ? `${backendUrl}/events?lastEventId=${lastEventId}`
      : `${backendUrl}/events`;

  console.log(`Opening connection to ${url}`);

  const eventSource = new EventSource(url);

  eventSource.onopen = () => {
    console.log('Opened connection to /events.');
  };

  eventSource.onerror = () => {
    window.removeEventListener('beforeunload', beforeUnloadHandler);
    eventSource.close();

    console.log(
      '⛔ Connection to /events has errored. Reconnecting in 10 seconds...'
    );
    setTimeout(
      () => setupEventSource(backendUrl, canvasWrapper, username),
      10000
    );
  };

  const beforeUnloadHandler = () => {
    // close sse connection on page reload
    console.log('Closing connection to /events on "beforeunload" event.');
    eventSource.close();
  };

  window.addEventListener('beforeunload', beforeUnloadHandler);

  eventSource.addEventListener('add', (evt) => {
    console.log(evt);
    if (evt instanceof MessageEvent) {
      lastEventId = evt.lastEventId;
      const addEventData = JSON.parse(evt.data) as AddEventData;
      const localShape = canvasWrapper.getRectShapeById(addEventData.id);
      if (localShape === null) {
        const localShapeWithUuid = canvasWrapper.getRectShapeByUuid(
          addEventData.uuid
        );
        if (localShapeWithUuid === null) {
          if (isImageRectData(addEventData)) {
            const image = new Image();
            const imageShape = new ImageShape(
              addEventData.x,
              addEventData.y,
              addEventData.w,
              addEventData.h,
              addEventData.uuid,
              image
            );
            imageShape.id = addEventData.id;
            canvasWrapper.addRectShape(imageShape);
            image.onload = () => {
              canvasWrapper.invalidate();
            };
            image.src = addEventData.imageSource;
          } else if (isFilledRectData(addEventData)) {
            const filledShape = new FilledShape(
              addEventData.x,
              addEventData.y,
              addEventData.w,
              addEventData.h,
              addEventData.uuid,
              addEventData.color
            );
            filledShape.id = addEventData.id;
            canvasWrapper.addRectShape(filledShape);
          }
        }
      }
    }
  });

  eventSource.addEventListener('resize', (evt) => {
    console.log(evt);
    if (evt instanceof MessageEvent) {
      lastEventId = evt.lastEventId;
      const shape = JSON.parse(evt.data) as ResizeEventData;
      const localShape = canvasWrapper.getRectShapeById(shape.id);
      if (localShape != null) {
        localShape.x = shape.x;
        localShape.y = shape.y;
        localShape.w = shape.w;
        localShape.h = shape.h;
        canvasWrapper.invalidate();
      }
    }
  });

  eventSource.addEventListener('remove', (evt) => {
    console.log(evt);
    if (evt instanceof MessageEvent) {
      lastEventId = evt.lastEventId;
      const hasId = JSON.parse(evt.data) as RemoveEventData;
      const localShape = canvasWrapper.getRectShapeById(hasId.id);
      if (localShape != null) {
        canvasWrapper.removeRectShape(localShape);
      }
    }
  });

  eventSource.addEventListener('select', (evt) => {
    console.log(evt);
    if (evt instanceof MessageEvent) {
      lastEventId = evt.lastEventId;
      const data = JSON.parse(evt.data) as SelectEventData;

      if (data.selector !== null && data.selector === username) return;

      if (data.selector !== null) {
        for (const rectShape of canvasWrapper.rectShapes) {
          if (rectShape.selector === data.selector) {
            rectShape.selector = null;
            canvasWrapper.invalidate();
          }
        }
      }

      if (data.id !== null) {
        const localShape = canvasWrapper.getRectShapeById(data.id);
        if (localShape != null) {
          localShape.selector = data.selector;
          canvasWrapper.invalidate();
        }
      }
    }
  });
}
