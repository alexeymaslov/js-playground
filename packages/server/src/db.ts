import { Client } from 'pg';
import { AddEventData, error } from '@my/shared';
import format from 'pg-format';

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

export async function getAddEvents(): Promise<AddEventData[]> {
  console.group('[DB] get events from db');
  console.time('[DB] get events');
  const events = [];
  try {
    const client = await connect();
    const sql = 'SELECT data FROM public.events';
    console.log(`[DB] Querying db with '${sql}'`);
    const rs = await client.query(sql);
    for (const row of rs.rows) {
      events.push(row.data as AddEventData);
    }

    console.log(`[DB] Got ${events.length} events`);
    await disconnect(client);
  } finally {
    console.timeEnd('[DB] get events');
    console.groupEnd();
  }

  return events;
}

export async function saveAddEvents(events: AddEventData[]): Promise<void> {
  console.group('[DB] save events to db');
  console.time('[DB] save events');
  try {
    const client = await connect();

    const deleteSql = 'DELETE FROM public.events';
    console.log(`[DB] Querying db with '${deleteSql}'`);
    await client.query(deleteSql);

    if (events.length !== 0) {
      const insertSql = format(
        'INSERT INTO public.events (data) VALUES %L;',
        events.map((e) => [e]) // have to wrap each value in array
      );
      // console.log(`[DB] Querying db with '${insertSql}'`);
      await client.query(insertSql);
    }

    console.log(`[DB] Inserted ${events.length} rows`);

    await disconnect(client);
  } finally {
    console.timeEnd('[DB] save events');
    console.groupEnd();
  }
}
