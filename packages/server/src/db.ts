import { Client } from 'pg';
import { error } from '@my/shared';
import format from 'pg-format';
import { isState, State } from './state';

const DATABASE_URL =
  process.env.DATABASE_URL ?? error('DATABASE_URL is not defined.');
const NODE_ENV: string =
  process.env.NODE_ENV ?? error('NODE_ENV is not defined.');

async function connect(): Promise<Client> {
  const config = {
    connectionString: DATABASE_URL,
    ssl: NODE_ENV === 'development' ? false : { rejectUnauthorized: false }
  };
  console.log('[DB] Connecting to db. Config:', config);
  const client = new Client(config);
  await client.connect();
  console.log('[DB] Connected to db');
  return client;
}

async function disconnect(client: Client): Promise<void> {
  console.log('[DB] Closing connection to db');
  await client.end();
  console.log('[DB] Closed connection to db');
}

export async function getState(): Promise<State> {
  console.group('[DB] get state from db');
  console.time('[DB] get state');
  let state: State = {
    authorInfo: [],
    messageEvents: [],
    addEvents: [],
    selectEvents: []
  };
  try {
    const client = await connect();
    const sql = 'SELECT data FROM public.events';
    console.log(`[DB] Querying db with '${sql}'`);
    const rs = await client.query(sql);
    if (rs.rowCount > 0) {
      const data = rs.rows[0].data;
      if (isState(data)) {
        state = data;
      } else {
        console.log(`[DB] Data from db is not of 'State' type`);
      }
    } else {
      console.log(`[DB] There is no data`);
    }

    await disconnect(client);
  } finally {
    console.timeEnd('[DB] get state');
    console.groupEnd();
  }

  return state;
}

export async function saveState(state: State): Promise<void> {
  console.group('[DB] save state to db');
  console.time('[DB] save state');
  try {
    const client = await connect();

    const deleteSql = 'DELETE FROM public.events';
    console.log(`[DB] Querying db with '${deleteSql}'`);
    await client.query(deleteSql);

    const insertSql = format('INSERT INTO public.events (data) VALUES %L;', [
      [state]
    ]);
    await client.query(insertSql);

    await disconnect(client);
  } finally {
    console.timeEnd('[DB] save state');
    console.groupEnd();
  }
}
