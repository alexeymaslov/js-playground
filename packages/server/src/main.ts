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

class ServerSentEvent {
  readonly data: string;
  readonly id: string;
  readonly event: string;

  constructor(data: string, id: string, event: string) {
    this.data = data;
    this.id = id;
    this.event = event;
  }

  toString() {
    return `data: ${this.data}\nid: ${this.id}\nevent: ${this.event}\n\n`;
  }
}

const port = parseInt(process.env['PORT'] || '5000');
const app = express();
const emitter = new EventEmitter();
let idCounter = 0;
let eventIdCounter = 0;
const state: (ShapeData & HasId & MaybeHasSelector)[] = [];
const events: ServerSentEvent[] = [];

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

  const query = req.query as { lastEventId?: string };
  let snapshot;
  if (query.lastEventId !== undefined) {
    if (events.length > 0) {
      const i = events.findIndex((x) => x.id === query.lastEventId);
      if (i !== -1) {
        console.log(
          `Requested events with lastEventId=${query.lastEventId} which is ${i}-th event.`
        );
        snapshot = events.slice(i + 1);
      } else {
        console.log(
          `Requested events with lastEventId=${query.lastEventId} but events list does not contain such id.`
        );
        // not sure how to correctly handle this case. just send all events to client
        snapshot = events;
      }
    } else {
      console.log(
        `Requested events with lastEventId=${query.lastEventId} but events list is empty.`
      );
      // not sure how to correctly handle this case. just send all events to client
      snapshot = events;
    }
  } else {
    snapshot = events;
  }

  if (snapshot.length > 0) {
    res.write(snapshot.map((x) => x.toString()).join(''));
  }

  const eventHandler = (body: string) => {
    res.write(body);
  };

  emitter.on('event', eventHandler);

  res.on('close', () => {
    console.log('client dropped me');
    emitter.removeListener('event', eventHandler);
    // todo emit event to deselect shapes selected by the consumer of the stream
    res.end();
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
    const sse = new ServerSentEvent(
      JSON.stringify(resizeRequestBody),
      eventIdCounter.toString(),
      'resize'
    );
    eventIdCounter++;
    events.push(sse);
    const body = sse.toString();
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
  const sse = new ServerSentEvent(
    JSON.stringify(addEventData),
    eventIdCounter.toString(),
    'add'
  );
  eventIdCounter++;
  events.push(sse);
  const body = sse.toString();
  emitter.emit('event', body);
});

app.post('/remove', (req, res) => {
  const hasId = req.body as HasId;
  const i = state.findIndex((value) => value.id == hasId.id);
  if (i !== -1) {
    res.sendStatus(200);
    state.splice(i, 1);
    const sse = new ServerSentEvent(
      JSON.stringify(hasId),
      eventIdCounter.toString(),
      'remove'
    );
    eventIdCounter++;
    events.push(sse);
    const body = sse.toString();
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

  const sse = new ServerSentEvent(
    JSON.stringify(requestBody),
    eventIdCounter.toString(),
    'select'
  );
  eventIdCounter++;
  events.push(sse);
  const data = sse.toString();
  emitter.emit('event', data);
});

app.listen(port, () => {
  return console.log(`server is listening on port ${port}`);
});
