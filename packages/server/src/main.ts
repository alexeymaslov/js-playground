import express from 'express';
import EventEmitter from 'events';
import {
  AddEventData,
  AddRequestBody,
  HasId,
  MaybeHasSelector,
  ResizeRequestBody,
  SelectRequestBody,
  ShapeData
} from '@my/shared';
import bodyParser from 'body-parser';

// todo looks like it is a bad practise to catch it like that
process.on('uncaughtException', function (err) {
  console.log(err);
});

const port = parseInt(process.env['PORT'] || '5000');
const app = express();
const emitter = new EventEmitter();
let idCounter = 0;
let eventIdCounter = 0;
const state: (ShapeData & HasId & MaybeHasSelector)[] = [];
const events: string[] = [];

app.use(bodyParser.json({ limit: '1mb', type: 'application/json' }));

// expected to run server from monorepo root with
// 'node packages/server/server/dist/main.js'
app.use(express.static('packages/client/dist'));

app.get('/events', async (req, res) => {
  console.log('Call to events.');
  res.statusCode = 200;
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.flushHeaders();

  if (events.length > 0) {
    const history = events.join('');
    res.write(history);
  }

  const eventHandler = (body: string) => {
    res.write(body);
  };

  emitter.on('event', eventHandler);

  res.on('close', () => {
    console.log('client dropped me');
    emitter.removeListener('event', eventHandler);
    // todo emit event to deselect shapes selected by the consumer of the stream
    // res.end();
  });
});

app.post('/resize', (req, res) => {
  const resizeRequestBody = req.body as ResizeRequestBody;
  const found = state.find((value) => value.id === resizeRequestBody.id);
  if (found) {
    res.sendStatus(200);
    found.x = resizeRequestBody.x;
    found.y = resizeRequestBody.y;
    found.w = resizeRequestBody.w;
    found.h = resizeRequestBody.w;
    const body = `data: ${JSON.stringify(
      resizeRequestBody
    )}\nid: ${eventIdCounter++}\nevent: resize\n\n`;
    events.push(body);
    emitter.emit('event', body);
  } else {
    console.warn(`Cannot find shape with id=${resizeRequestBody.id} in state.`);
    res.sendStatus(404);
  }
});

app.post('/add', (req, res) => {
  const addRequestBody = req.body as AddRequestBody;
  const hasId: HasId = { id: idCounter++ };
  res.status(200).json(hasId);
  const addEventData: AddEventData = { ...addRequestBody, ...hasId };
  state.push({ ...addEventData, selector: null });
  const body = `data: ${JSON.stringify(
    addEventData
  )}\nid: ${eventIdCounter++}\nevent: add\n\n`;
  events.push(body);
  emitter.emit('event', body);
});

app.post('/remove', (req, res) => {
  const hasId = req.body as HasId;
  const i = state.findIndex((value) => value.id == hasId.id);
  if (i !== -1) {
    res.sendStatus(200);
    state.splice(i, 1);
    const body = `data: ${JSON.stringify(
      hasId
    )}\nid: ${eventIdCounter++}\nevent: remove\n\n`;
    events.push(body);
    emitter.emit('event', body);
  } else {
    console.warn(`Cannot find shape with id=${hasId.id} in state.`);
    res.sendStatus(404);
  }
});

app.post('/select', (req, res) => {
  const requestBody = req.body as SelectRequestBody;

  // todo looks like theres similar logic in the client code
  if (requestBody.id === null) {
    for (const elem of state) {
      if (elem.selector === requestBody.selector) {
        elem.selector = null;
      }
    }
  }

  res.sendStatus(200);
  const found = state.find((value) => value.id === requestBody.id);
  if (found) {
    found.selector = requestBody.selector;
  }

  const data = `data: ${JSON.stringify(
    requestBody
  )}\nid: ${eventIdCounter++}\nevent: select\n\n`;
  events.push(data);
  emitter.emit('event', data);
});

app.get('/snapshot', (req, res) => {
  res.status(200).json(state);
});

app.listen(port, () => {
  return console.log(`server is listening on port ${port}`);
});
