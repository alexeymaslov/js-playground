import { CanvasWrapper } from './canvasWrapper';
import { FilledShape } from './filledShape';
import { EventCanvasPositionGetter } from './eventCanvasPositionGetter';
import { RectShape } from './rectShape';
import {
  AddEventData,
  AddRequestBody,
  AddResponseBody,
  RemoveEventData,
  RemoveRequestBody,
  isFilledRectData,
  isImageRectData,
  ResizeEventData,
  ResizeRequestBody,
  SelectEventData,
  SelectRequestBody
} from '@my/shared';
import {
  uniqueNamesGenerator,
  adjectives,
  animals
} from 'unique-names-generator';
import './styles.css';
import { getRandomColor } from '@my/shared';
import { initDragAndDrop } from './initDragAndDrop';
import { ImageShape } from './imageShape';

const backendUrl = 'http://localhost:5000';
// const backendUrl = 'https://roll202.herokuapp.com';

const canvas = document.getElementById('canvas');
if (!(canvas instanceof HTMLCanvasElement))
  throw new Error(
    `Element with id=canvas should be instance of HTMLCanvasElement.`
  );

const onRectShapeCreated = async (
  rectShape: RectShape,
  imageSource: string | null = null
) => {
  let body: AddRequestBody;
  if (imageSource !== null) {
    body = {
      x: rectShape.x,
      y: rectShape.y,
      w: rectShape.w,
      h: rectShape.h,
      uuid: rectShape.uuid,
      imageSource: imageSource
    };
  } else {
    body = {
      x: rectShape.x,
      y: rectShape.y,
      w: rectShape.w,
      h: rectShape.h,
      uuid: rectShape.uuid,
      color: (rectShape as FilledShape).fillStyle
    };
  }

  const response = await fetch(`${backendUrl}/add`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });
  const responseBody = (await response.json()) as AddResponseBody;
  rectShape.id = responseBody.id;
};

const onRectShapeUpdated = (rectShape: RectShape) => {
  if (rectShape.id == null) {
    console.log('Will not send resize update because rect shape is missing id');
    return;
  }

  const body: ResizeRequestBody = {
    x: rectShape.x,
    y: rectShape.y,
    w: rectShape.w,
    h: rectShape.h,
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

const onRectShapeDeleted = (rectShape: RectShape) => {
  if (rectShape.id == null) {
    console.log('Will not send remove update because rect shape is missing id');
    return;
  }

  const body: RemoveRequestBody = {
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

const onRectShapeSelected = (rectShape: RectShape | null) => {
  if (rectShape !== null && rectShape.id == null) {
    console.log('Will not send select update because rect shape is missing id');
    return;
  }

  const id = rectShape === null ? null : rectShape.id;
  const body: SelectRequestBody = {
    id: id,
    selector: username
  };
  fetch(`${backendUrl}/select`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });
};

const eventCanvasPositionGetter = new EventCanvasPositionGetter(canvas);
const canvasWrapper = new CanvasWrapper(
  canvas,
  eventCanvasPositionGetter,
  onRectShapeCreated,
  onRectShapeUpdated,
  onRectShapeDeleted,
  onRectShapeSelected
);
initDragAndDrop(canvas, canvasWrapper);

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

// todo wtf
//  >> colorr
//  >> colorrr
let username = localStorage.getItem('username');
let colorr = localStorage.getItem('color');
if (username === null || colorr === null) {
  const adjective = uniqueNamesGenerator({
    dictionaries: [adjectives]
  });
  const colorrr = getRandomColor();
  // uniqueNamesGenerator({
  //   dictionaries: [colors]
  // });
  const animal = uniqueNamesGenerator({
    dictionaries: [animals]
  });
  username = `${adjective} ${colorrr} ${animal}`;
  colorr = colorrr;
  localStorage.setItem('username', username);
  localStorage.setItem('color', colorrr);
}

export const color = colorr!;

const paragraph = document.getElementById(
  'hello_username_text'
) as HTMLParagraphElement;

paragraph.textContent = paragraph.textContent!.replace('username', username);
