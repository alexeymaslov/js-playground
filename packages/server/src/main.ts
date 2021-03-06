import express from 'express';
import EventEmitter from 'events';
import {
  AddEventData,
  AddRequestBody,
  getNextHue,
  MessageEventData,
  MessageRequestBody,
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
import Timeout = NodeJS.Timeout;
import { getState, saveState } from './db';
import { Server } from 'http';

process.on('uncaughtException', function (err) {
  console.error('Uncaught Exception: ', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled rejection at ', promise, 'reason: ', reason);
  process.exit(1);
});

process.on('SIGTERM', () => {
  const saveToDb = () => {
    console.log('[Main] SIGTERM. Saving state to db');
    save()
      .then(() => process.exit(0))
      .catch((err) => {
        console.error('[Main] Failed to save events to db', err);
        process.exit(1);
      });
  };

  if (server !== null) {
    console.log('[Main] SIGTERM. Closing server');
    server.close((err?) => {
      if (err !== undefined) {
        console.error('[Main] SIGTERM. Error on server closing:', err);
      } else {
        console.log('[Main] SIGTERM. Closed server');
      }

      saveToDb();
    });
  } else {
    saveToDb();
  }
});

const port = parseInt(process.env['PORT'] || '5000');
const app = express();
const emitter = new EventEmitter();

let state: State = {
  addEvents: [],
  selectEvents: [],
  messageEvents: [],
  authorInfo: []
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

    for (const messageEvent of state.messageEvents) {
      snapshot.push(
        new ServerSentEvent(JSON.stringify(messageEvent), uuidv4(), 'message')
      );
    }
  }

  res.flushHeaders();

  if (snapshot.length > 0) {
    res.write(snapshot.map((x) => x.toString()).join(''));
  }

  // send heartbeat message every 30 sec to keep sse connection alive
  const heartbeatTimeout: Timeout = setInterval(() => {
    res.write(`event:heartbeat\nid:${uuidv4()}\ndata:\n\n`);
  }, 30000);

  const eventHandler = (body: string) => {
    heartbeatTimeout.refresh();
    res.write(body);
  };

  emitter.on('event', eventHandler);

  message(
    {
      author: username,
      time: nowAsString(),
      text: ''
    },
    ' has joined'
  );

  res.on('close', () => {
    console.log(`Client with username=${username} dropped me.`);
    select({ username: username, uuid: null });
    message(
      {
        author: username,
        time: nowAsString(),
        text: ''
      },
      ' has left'
    );
    emitter.removeListener('event', eventHandler);
    clearInterval(heartbeatTimeout);
    res.end();
  });
});

function nowAsString() {
  return JSON.stringify(new Date()).slice(1, -1);
}

app.post('/resize', (req, res) => {
  const resizeEventData: ResizeEventData = req.body as ResizeRequestBody;
  const found = state.addEvents.find((x) => x.uuid === resizeEventData.uuid);
  if (found) {
    found.x = resizeEventData.x;
    found.y = resizeEventData.y;
    found.w = resizeEventData.w;
    found.h = resizeEventData.h;
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

app.post('/message', (req, res) => {
  const messageRequestBody = req.body as MessageRequestBody;
  message(messageRequestBody);
  res.sendStatus(200);
});

function message(requestBody: MessageRequestBody, appendAuthor?: string) {
  let authorInfo = state.authorInfo.find(
    (o) => o.author === requestBody.author
  );
  if (authorInfo === undefined) {
    const hues = state.authorInfo.map((o) => o.hue);
    const hue = getNextHue(hues);
    authorInfo = {
      author: requestBody.author,
      color: `hsl(${hue}, 100%, 97%)`,
      hue: hue
    };
    state.authorInfo.push(authorInfo);
  }

  if (appendAuthor !== undefined) {
    requestBody.author += appendAuthor;
  }

  const eventData: MessageEventData = {
    ...requestBody,
    color: authorInfo.color
  };
  state.messageEvents.push(eventData);
  if (state.messageEvents.length > 100) {
    state.messageEvents.splice(0);
  }

  const sse = new ServerSentEvent(
    JSON.stringify(eventData),
    uuidv4(),
    'message'
  );
  events.push(sse);
  emitter.emit('event', sse.toString());
}

app.get('/save', (_req, res) => {
  save()
    .then(() => res.sendStatus(200))
    .catch((err) => {
      console.error('[Main] Failed to save events to db', err);
      res.sendStatus(500);
    });
});

async function save() {
  return saveState({
    addEvents: state.addEvents,
    messageEvents: state.messageEvents,
    authorInfo: state.authorInfo,
    selectEvents: []
  });
}

let server: Server | null = null;
getState()
  .then((s) => (state = s))
  .catch((err) => console.error('[Main] Failed to get events from db', err))
  .finally(() => {
    server = app.listen(port, () => {
      return console.log(`[Main] Server is listening on port=${port}`);
    });
  });
