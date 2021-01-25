export type Shape = ShapeGeometry & HasId;

export type HasId = { id: number };

export type ShapeGeometry = {
    x: number;
    y: number;
    width: number;
    height: number;
};