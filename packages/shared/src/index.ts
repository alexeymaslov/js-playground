export type Shape = ShapeGeometry & HasId;

export type HasId = { id: number };

export type ShapeGeometry = {
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
};

export type Uuid = string;

export type HasUuid = {
  uuid: Uuid;
};

export type AddRequestData = ShapeGeometry & HasUuid;

export type AddEventData = AddRequestData & HasId;

export * from './helpers';
