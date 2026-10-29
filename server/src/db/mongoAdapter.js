// محوّل MongoDB — نفس الواجهة تمامًا مثل محوّل JSON.
// التفعيل: DB_DRIVER=mongo و MONGO_URI و MONGO_DB_NAME في ملف .env
import crypto from 'crypto';
import { COLLECTIONS } from './jsonAdapter.js';

const NO_ID = { projection: { _id: 0 } };

export function createMongoAdapter(uri, dbName) {
  let client;
  let db;
  const col = (c) => db.collection(c);

  return {
    name: 'mongo',
    async init() {
      let MongoClient;
      try {
        ({ MongoClient } = await import('mongodb'));
      } catch {
        throw new Error('حزمة mongodb غير مثبتة. نفّذ: npm install mongodb --prefix server');
      }
      client = new MongoClient(uri, { serverSelectionTimeoutMS: 8000 });
      await client.connect();
      db = client.db(dbName);
      for (const c of COLLECTIONS) await col(c).createIndex({ id: 1 }, { unique: true });
      await col('users').createIndex({ email: 1 }, { unique: true });
      await col('activities').createIndex({ ownerId: 1 });
      await col('activities').createIndex({ published: 1, isPublic: 1 });
      await col('results').createIndex({ activityId: 1 });
    },
    find: (c, q = {}) => col(c).find(q, NO_ID).toArray(),
    findOne: (c, q) => col(c).findOne(q, NO_ID),
    async insert(c, doc) {
      const d = { id: crypto.randomUUID(), ...doc };
      await col(c).insertOne({ ...d });
      return d;
    },
    async update(c, id, patch) {
      const { id: _drop, _id, ...rest } = patch;
      return col(c).findOneAndUpdate({ id }, { $set: rest }, { returnDocument: 'after', ...NO_ID });
    },
    async remove(c, id) {
      return (await col(c).deleteOne({ id })).deletedCount > 0;
    },
    async removeWhere(c, q) {
      return (await col(c).deleteMany(q)).deletedCount;
    },
    count: (c, q = {}) => col(c).countDocuments(q),
    async close() {
      await client?.close();
    },
  };
}
