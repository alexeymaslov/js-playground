export type RectData = {
  x: number;
  y: number;
  w: number;
  h: number;
};

export type FilledRectData = RectData & { color: string };
export type ImageRectData = RectData & { imageSource: string };

export type ShapeData = FilledRectData | ImageRectData;

export type Uuid = string;
export type HasUuid = { uuid: Uuid };
export type HasUsername = { username: string };

export type AddRequestBody = ShapeData & HasUuid;
export type AddEventData = AddRequestBody;

export type ResizeRequestBody = RectData & HasUuid;
export type ResizeEventData = ResizeRequestBody;

export type RemoveRequestBody = HasUuid;
export type RemoveEventData = RemoveRequestBody;

export type SelectRequestBody = { uuid: Uuid | null } & HasUsername;
export type SelectEventData = SelectRequestBody;

export type MessageRequestBody = { author: string; time: string; text: string };
export type MessageEventData = MessageRequestBody & { color: string };

export function isImageRectData(
  shapeData: ShapeData
): shapeData is ImageRectData {
  return (<ImageRectData>shapeData).imageSource !== undefined;
}

export function isFilledRectData(
  shapeData: ShapeData
): shapeData is FilledRectData {
  return (<FilledRectData>shapeData).color !== undefined;
}

export * from './helpers';
export * from './colors';
