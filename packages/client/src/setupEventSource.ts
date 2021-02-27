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

export function setupEventSource(
  backendUrl: string,
  canvasWrapper: CanvasWrapper,
  username: string,
  shouldClearCanvasOnOpen?: boolean
): void {
  const url = `${backendUrl}/events?username=${username}`;
  console.info(`[EventSource] Opening connection to ${url}`);
  const eventSource = new EventSource(url);

  eventSource.onopen = () => {
    if (shouldClearCanvasOnOpen !== undefined && shouldClearCanvasOnOpen) {
      console.info(
        '[EventSource] Opened a new connection to /events after error. Clearing canvas'
      );
      canvasWrapper.clear();
      shouldClearCanvasOnOpen = false;
    } else {
      console.info('[EventSource] Opened connection to /events.');
    }
  };

  eventSource.onerror = () => {
    if (eventSource.readyState === EventSource.CONNECTING) {
      // should reconnect automatically
      console.info(
        '[EventSource] Connection to /events has errored. Reconnecting automatically...'
      );
    } else if (eventSource.readyState === EventSource.CLOSED) {
      // have to setup new eventSource and reinit canvas when connected
      window.removeEventListener('beforeunload', beforeUnloadHandler);
      eventSource.close();

      console.warn(
        '[EventSource] Connection to /events has errored. Setting up new EventSource in 10 seconds...'
      );
      setTimeout(
        () => setupEventSource(backendUrl, canvasWrapper, username, true),
        10000
      );
    }
  };

  const beforeUnloadHandler = () => {
    // close sse connection on page reload
    console.info(
      '[EventSource] Closing connection to /events on "beforeunload" event.'
    );
    eventSource.close();
  };

  window.addEventListener('beforeunload', beforeUnloadHandler);

  eventSource.addEventListener('add', (evt) => {
    if (evt instanceof MessageEvent) {
      const addEventData = JSON.parse(evt.data) as AddEventData;
      console.info('[EventSource] add:', addEventData);
      const localShape = canvasWrapper.getRectShapeByUuid(addEventData.uuid);
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
            canvasWrapper.addRectShape(filledShape);
          }
        }
      }
    }
  });

  eventSource.addEventListener('resize', (evt) => {
    if (evt instanceof MessageEvent) {
      const shape = JSON.parse(evt.data) as ResizeEventData;
      console.info('[EventSource] resize:', shape);
      const localShape = canvasWrapper.getRectShapeByUuid(shape.uuid);
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
    if (evt instanceof MessageEvent) {
      const hasId = JSON.parse(evt.data) as RemoveEventData;
      console.info('[EventSource] remove:', hasId);
      const localShape = canvasWrapper.getRectShapeByUuid(hasId.uuid);
      if (localShape != null) {
        canvasWrapper.removeRectShape(localShape);
      }
    }
  });

  eventSource.addEventListener('select', (evt) => {
    if (evt instanceof MessageEvent) {
      const data = JSON.parse(evt.data) as SelectEventData;
      console.info('[EventSource] select:', data);

      for (const rectShape of canvasWrapper.rectShapes) {
        if (rectShape.selector === data.username) {
          rectShape.selector = null;
          canvasWrapper.invalidate();
        }
      }

      if (data.uuid !== null) {
        const localShape = canvasWrapper.getRectShapeByUuid(data.uuid);
        if (localShape != null) {
          localShape.selector = data.username;
          canvasWrapper.invalidate();
        }
      }
    }
  });
}
