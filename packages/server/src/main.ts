import express from 'express';
import EventEmitter from 'events';
import {
  AddEventData,
  AddRequestBody,
  RemoveEventData,
  RemoveRequestBody,
  ResizeEventData,
  ResizeRequestBody,
  SelectRequestBody,
  uuidv4
} from '@my/shared';
import bodyParser from 'body-parser';
import { ServerSentEvent } from './serverSentEvent';
import { State } from './state';

// todo looks like it is a bad practise to catch it like that
process.on('uncaughtException', function (err) {
  console.log(err);
});

const port = parseInt(process.env['PORT'] || '5000');
const app = express();
const emitter = new EventEmitter();

const state: State = {
  addEvents: [],
  selectEvents: []
};
const events: ServerSentEvent[] = [];

app.use(bodyParser.json({ limit: '1mb', type: 'application/json' }));

// expected to run server from monorepo root with
// 'node packages/server/server/dist/main.js'
app.use(express.static('packages/client/dist'));

app.get('/events', async (req, res) => {
  const lastEventId = req.header('Last-Event-Id');
  const query = req.query as { username: string };
  const username = query.username;

  console.log(
    `Call to /events; username=${username}; Last-Event-Id=${lastEventId}`
  );

  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.statusCode = 200;

  let snapshot: ServerSentEvent[] = [];
  if (lastEventId !== undefined && lastEventId !== '') {
    console.log(`user=${username} is reconnecting`);
    const i = events.findIndex((e) => e.id === lastEventId);
    if (i != -1) {
      snapshot = events.splice(i + 1);
    } else {
      console.log(
        `user=${username} should close connection and open it again. returning 204 code`
      );
      res.sendStatus(204);
      return;
    }
  } else {
    console.log(`user=${username} is first time connecting`);
    for (const addEvent of state.addEvents) {
      snapshot.push(
        new ServerSentEvent(JSON.stringify(addEvent), uuidv4(), 'add')
      );
    }

    for (const selectEvent of state.selectEvents) {
      snapshot.push(
        new ServerSentEvent(JSON.stringify(selectEvent), uuidv4(), 'select')
      );
    }
  }

  res.flushHeaders();

  if (snapshot.length > 0) {
    res.write(snapshot.map((x) => x.toString()).join(''));
  }

  const eventHandler = (body: string) => {
    res.write(body);
  };

  emitter.on('event', eventHandler);

  res.on('close', () => {
    console.log(`Client with username=${username} dropped me.`);
    select({ username: username, uuid: null });
    emitter.removeListener('event', eventHandler);
    res.end();
  });
});

app.post('/resize', (req, res) => {
  const resizeEventData: ResizeEventData = req.body as ResizeRequestBody;
  const found = state.addEvents.find((x) => x.uuid === resizeEventData.uuid);
  if (found) {
    found.x = resizeEventData.x;
    found.y = resizeEventData.y;
    found.w = resizeEventData.w;
    found.h = resizeEventData.w;
    res.sendStatus(200);

    const sse = new ServerSentEvent(
      JSON.stringify(resizeEventData),
      uuidv4(),
      'resize'
    );
    events.push(sse);
    emitter.emit('event', sse.toString());
  } else {
    res.sendStatus(204);
  }
});

app.post('/add', (req, res) => {
  const addEventData: AddEventData = req.body as AddRequestBody;
  state.addEvents.push(addEventData);
  res.sendStatus(200);

  const serverSentEvent = new ServerSentEvent(
    JSON.stringify(addEventData),
    uuidv4(),
    'add'
  );
  events.push(serverSentEvent);
  emitter.emit('event', serverSentEvent.toString());
});

app.post('/remove', (req, res) => {
  const removeEventData: RemoveEventData = req.body as RemoveRequestBody;
  const index = state.addEvents.findIndex(
    (x) => x.uuid === removeEventData.uuid
  );
  if (index !== -1) {
    state.addEvents.splice(index, 1);
    res.sendStatus(200);

    const sse = new ServerSentEvent(
      JSON.stringify(removeEventData),
      uuidv4(),
      'resize'
    );
    events.push(sse);
    emitter.emit('event', sse.toString());
  } else {
    res.sendStatus(204);
  }
});

app.post('/select', (req, res) => {
  const selectRequestBody = req.body as SelectRequestBody;
  select(selectRequestBody);
  res.sendStatus(200);
});

function select(selectRequestBody: SelectRequestBody) {
  const e = state.selectEvents.find(
    (e) => e.username === selectRequestBody.username
  );
  if (e !== undefined) {
    e.uuid = selectRequestBody.uuid;
  } else {
    state.selectEvents.push(selectRequestBody);
  }

  const sse = new ServerSentEvent(
    JSON.stringify(selectRequestBody),
    uuidv4(),
    'select'
  );
  events.push(sse);
  emitter.emit('event', sse.toString());
}

app.listen(port, () => {
  return console.log(`server is listening on port ${port}`);
});
