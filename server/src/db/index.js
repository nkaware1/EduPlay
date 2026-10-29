import { config } from '../config.js';
import { createJsonAdapter } from './jsonAdapter.js';

// لإضافة قاعدة بيانات أخرى (PostgreSQL، SQLite…): أنشئ محوّلًا يطبّق نفس الدوال
// (init, find, findOne, insert, update, remove, removeWhere, count, close) وأضفه هنا.
export async function createDb() {
  let db;
  if (config.dbDriver === 'mongo') {
    const { createMongoAdapter } = await import('./mongoAdapter.js');
    db = createMongoAdapter(config.mongoUri, config.mongoDb);
  } else {
    db = createJsonAdapter(config.jsonPath);
  }
  await db.init();
  return db;
}
