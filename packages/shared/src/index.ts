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

export type HasId = { id: number };
export type MaybeHasId = { id: number | null };
export type MaybeHasSelector = { selector: string | null };
export type HasUuid = { uuid: Uuid };

export type AddRequestBody = ShapeData & HasUuid;
export type AddResponseBody = HasId;
export type AddEventData = AddRequestBody & HasId;

export type ResizeRequestBody = RectData & HasId;
export type ResizeEventData = ResizeRequestBody;

export type RemoveRequestBody = HasId;
export type RemoveEventData = RemoveRequestBody;

export type SelectRequestBody = MaybeHasId & MaybeHasSelector;
export type SelectEventData = SelectRequestBody;

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
