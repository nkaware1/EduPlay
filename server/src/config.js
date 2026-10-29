import 'dotenv/config';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isProd = process.env.NODE_ENV === 'production';

export const config = {
  isProd,
  port: Number(process.env.PORT) || 4000,
  jwtSecret: process.env.JWT_SECRET || 'dev-secret-change-me',
  dbDriver: (process.env.DB_DRIVER || 'json').toLowerCase(),
  jsonPath: path.resolve(process.env.JSON_DB_PATH || path.join(__dirname, '../data/db.json')),
  mongoUri: process.env.MONGO_URI || 'mongodb://127.0.0.1:27017',
  mongoDb: process.env.MONGO_DB_NAME || 'lamaa',
  clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  clientDist: path.resolve(__dirname, '../../client/dist'),
  aiKey: process.env.ANTHROPIC_API_KEY || '',
  aiModel: process.env.AI_MODEL || 'claude-sonnet-5-5',
  aiBase: (process.env.ANTHROPIC_BASE_URL || 'https://api.anthropic.com').replace(/\/$/, ''),
  aiPerHour: Number(process.env.AI_MAX_PER_HOUR) || 30,
  uploadDir: path.resolve(__dirname, '../uploads'),
};

if (isProd && config.jwtSecret === 'dev-secret-change-me') {
  console.error('✖ يجب ضبط JWT_SECRET في وضع production');
  process.exit(1);
}
