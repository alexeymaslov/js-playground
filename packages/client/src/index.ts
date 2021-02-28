import { CanvasWrapper } from './canvasWrapper';
import { FilledShape } from './filledShape';
import { EventCanvasPositionGetter } from './eventCanvasPositionGetter';
import { RectShape } from './rectShape';
import {
  AddRequestBody,
  RemoveRequestBody,
  ResizeRequestBody,
  SelectRequestBody,
  error
} from '@my/shared';
import './styles.css';
import { initDragAndDrop } from './initDragAndDrop';
import { getUserInfo } from './getUserInfo';
import { setupEventSource } from './setupEventSource';

const backendUrl: string =
  process.env.BACKEND_URL ?? error('BACKEND_URL is not defined.');

const canvas = document.getElementById('canvas');
if (!(canvas instanceof HTMLCanvasElement))
  throw new Error(
    `Element with id=canvas should be instance of HTMLCanvasElement.`
  );
const canvasParent: HTMLElement =
  canvas.parentElement ?? error('canvas must have parent element');

const userInfo = getUserInfo();
const username = userInfo.username;
export const color = userInfo.color;

const onRectShapeCreated = (
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

  // todo handle error here and delete rect from canvasWrapper
  fetch(`${backendUrl}/add`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });
};

const onRectShapeUpdated = (rectShape: RectShape) => {
  const body: ResizeRequestBody = {
    x: rectShape.x,
    y: rectShape.y,
    w: rectShape.w,
    h: rectShape.h,
    uuid: rectShape.uuid
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
  const body: RemoveRequestBody = {
    uuid: rectShape.uuid
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
  const body: SelectRequestBody = {
    uuid: rectShape?.uuid ?? null,
    username: username
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
  canvasParent,
  eventCanvasPositionGetter,
  onRectShapeCreated,
  onRectShapeUpdated,
  onRectShapeDeleted,
  onRectShapeSelected
);
initDragAndDrop(canvas, canvasWrapper);

setupEventSource(backendUrl, canvasWrapper, username);

const usernameElement: HTMLElement =
  document.getElementById('username') ?? error("There's no #username element");
usernameElement.innerText = username;

const chat: HTMLElement =
  document.getElementById('chat') ?? error("There's no #chat element");
const chatButton: HTMLButtonElement =
  (document.getElementById('chat_button') as HTMLButtonElement) ??
  error("There's no #chat_button element");
chatButton.onclick = (_ev) => (chat.hidden = !chat.hidden);

const roll: HTMLElement =
  document.getElementById('roll') ?? error("There's no #roll element");
const rollButton: HTMLButtonElement =
  (document.getElementById('roll_button') as HTMLButtonElement) ??
  error("There's no #roll_button element");
rollButton.onclick = (_ev) => (roll.hidden = !roll.hidden);
