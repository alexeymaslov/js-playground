import express from 'express';
import EventEmitter from 'events';
import {HasId, Shape, ShapeGeometry} from '@my/shared';

const port = parseInt(process.env['PORT'] || '5000');
const app = express();
const emitter = new EventEmitter();
let idCounter = 0;
let eventIdCounter = 0;
const state: Shape[] = [];

app.use(express.json());

// expected to run server from monorepo root with node packages/server/server/dist/main.js
app.use(express.static('packages/client/public'));

app.get('/events', async (req, res) => {
    res.statusCode = 200;
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.flushHeaders();

    const addHandler = (shape: Shape, eventId: number) => {
        state.push(shape);
        res.write(`data: ${JSON.stringify(shape)}\nid: ${eventId}\nevent: add`);
    };

    const resizeHandler = (shape: Shape, eventId: number) => {
        const found = state.find((value) => value.id === shape.id);
        if (found) {
            found.x = shape.x;
            found.y = shape.y;
            found.width = shape.width;
            found.height = shape.height;
            res.write(
                `data: ${JSON.stringify(shape)}\nid: ${eventId}\nevent: resize`
            );
        } else {
            console.warn(`Cannot find shape with id=${shape.id} in state.`);
        }
    };

    const removeHandler = (hasId: HasId, eventId: number) => {
        const i = state.findIndex((value) => value.id == hasId.id);
        if (i !== -1) {
            state.splice(i, 1);
            res.write(
                `data: ${JSON.stringify(hasId)}\nid: ${eventId}\nevent: remove`
            );
        } else {
            console.warn(`Cannot find shape with id=${hasId.id} in state.`);
        }
    };

    emitter.on('add', addHandler);
    emitter.on('update', resizeHandler);
    emitter.on('remove', removeHandler);

    res.on('close', () => {
        console.log('client dropped me');
        emitter.removeListener('add', addHandler);
        emitter.removeListener('update', resizeHandler);
        emitter.removeListener('remove', removeHandler);
        res.end();
    });
});

app.post('/resize', (req, res) => {
    const shape = req.body as Shape;
    console.log(`resize: ${shape}`);
    emitter.emit('resize', shape, eventIdCounter++);
    res.sendStatus(200);
});

app.post('/add', (req, res) => {
    const shapeGeometry = req.body as ShapeGeometry;
    console.log(`add: ${shapeGeometry}`);
    const hasId: HasId = { id: idCounter++ };
    res.status(200).json(hasId);
    const shape: Shape = { ...shapeGeometry, ...hasId };
    emitter.emit('add', shape, eventIdCounter++);
});

app.post('/remove', (req, res) => {
    const hasId = req.body as HasId;
    console.log(`remove: ${hasId}`);
    emitter.emit('remove', hasId, eventIdCounter++);
    res.sendStatus(200);
});

app.get('/snapshot', (req, res) => {
    res.status(200).json(state);
});

app.listen(port, () => {
    return console.log(`server is listening on port ${port}`);
});
