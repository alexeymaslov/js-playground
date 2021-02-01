import express from 'express';
import EventEmitter from 'events';
import { AddEventData, AddRequestData, HasId, Shape } from '@my/shared';

// todo looks like it is a bad practise to catch it like that
process.on('uncaughtException', function (err) {
  console.log(err);
});

const port = parseInt(process.env['PORT'] || '5000');
const app = express();
const emitter = new EventEmitter();
let idCounter = 0;
let eventIdCounter = 0;
const state: Shape[] = [];
const events: string[] = [];

app.use(express.json());

// expected to run server from monorepo root with
// 'node packages/server/server/dist/main.js'
app.use(express.static('packages/client/dist'));

app.get('/events', async (req, res) => {
  console.log('Call to events.');
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    // eslint-disable-next-line prettier/prettier
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*'
  });

  if (events.length > 0) {
    const history = events.join('');
    res.write(history);
  }
  // res.statusCode = 200;
  // res.setHeader('Cache-Control', 'no-cache');
  // res.setHeader('Content-Type', 'text/event-stream');
  // res.setHeader('Connection', 'keep-alive');
  // res.setHeader('Access-Control-Allow-Origin', '*');
  // res.flushHeaders();

  const addHandler = (addEventData: AddEventData, eventId: number) => {
    state.push(addEventData);
    const body = `data: ${JSON.stringify(
      addEventData
    )}\nid: ${eventId}\nevent: add\n\n`;
    events.push(body);
    console.log(`writing add event ${body}`);
    res.write(body);
  };

  const resizeHandler = (shape: Shape, eventId: number) => {
    const found = state.find((value) => value.id === shape.id);
    if (found) {
      found.x = shape.x;
      found.y = shape.y;
      found.width = shape.width;
      found.height = shape.height;
      const body = `data: ${JSON.stringify(
        shape
      )}\nid: ${eventId}\nevent: resize\n\n`;
      console.log(`writing resize event \n${body}`);
      events.push(body);
      res.write(body);
    } else {
      console.warn(`Cannot find shape with id=${shape.id} in state.`);
    }
  };

  const removeHandler = (hasId: HasId, eventId: number) => {
    const i = state.findIndex((value) => value.id == hasId.id);
    if (i !== -1) {
      state.splice(i, 1);
      const body = `data: ${JSON.stringify(
        hasId
      )}\nid: ${eventId}\nevent: remove\n\n`;
      console.log(`writing remove event ${body}`);
      events.push(body);
      res.write(body);
    } else {
      console.warn(`Cannot find shape with id=${hasId.id} in state.`);
    }
  };

  emitter.on('add', addHandler);
  emitter.on('resize', resizeHandler);
  emitter.on('remove', removeHandler);

  res.on('close', () => {
    console.log('client dropped me');
    emitter.removeListener('add', addHandler);
    emitter.removeListener('update', resizeHandler);
    emitter.removeListener('remove', removeHandler);
    // res.end();
  });
});

app.post('/resize', (req, res) => {
  const shape = req.body as Shape;
  console.log(`resize:`);
  console.log(`${shape}`);
  emitter.emit('resize', shape, eventIdCounter++);
  res.sendStatus(200);
});

app.post('/add', (req, res) => {
  const addRequestData = req.body as AddRequestData;
  console.log(`add: ${addRequestData}`);
  const hasId: HasId = { id: idCounter++ };
  res.status(200).json(hasId);
  const addEventData: AddEventData = { ...addRequestData, ...hasId };
  emitter.emit('add', addEventData, eventIdCounter++);
});

app.post('/remove', (req, res) => {
  const hasId = req.body as HasId;
  console.log(`remove:`);
  console.log(`${hasId}`);
  emitter.emit('remove', hasId, eventIdCounter++);
  res.sendStatus(200);
});

app.get('/snapshot', (req, res) => {
  res.status(200).json(state);
});

app.listen(port, () => {
  return console.log(`server is listening on port ${port}`);
});
