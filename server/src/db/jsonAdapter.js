// محوّل قاعدة بيانات JSON: ملف واحد، يُحمَّل في الذاكرة ويُكتب بشكل ذري.
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

export const COLLECTIONS = ['users', 'activities', 'results', 'classes', 'votes'];
const match = (doc, q) => Object.entries(q).every(([k, v]) => doc[k] === v);

export function createJsonAdapter(file) {
  let data = {};
  let timer = null;

  function flush() {
    clearTimeout(timer);
    timer = null;
    fs.mkdirSync(path.dirname(file), { recursive: true });
    const tmp = file + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(data));
    fs.renameSync(tmp, file);
  }
  const save = () => {
    clearTimeout(timer);
    timer = setTimeout(flush, 50);
  };

  return {
    name: 'json',
    async init() {
      if (fs.existsSync(file)) {
        try {
          data = JSON.parse(fs.readFileSync(file, 'utf8'));
        } catch {
          fs.copyFileSync(file, `${file}.corrupt-${Date.now()}`);
          data = {};
        }
      }
      for (const c of COLLECTIONS) data[c] ??= [];
      process.on('exit', () => timer && flush());
    },
    async find(c, q = {}) {
      return structuredClone(data[c].filter((d) => match(d, q)));
    },
    async findOne(c, q) {
      const d = data[c].find((x) => match(x, q));
      return d ? structuredClone(d) : null;
    },
    async insert(c, doc) {
      const d = { id: crypto.randomUUID(), ...structuredClone(doc) };
      data[c].push(d);
      save();
      return structuredClone(d);
    },
    async update(c, id, patch) {
      const i = data[c].findIndex((d) => d.id === id);
      if (i < 0) return null;
      data[c][i] = { ...data[c][i], ...structuredClone(patch), id };
      save();
      return structuredClone(data[c][i]);
    },
    async remove(c, id) {
      const n = data[c].length;
      data[c] = data[c].filter((d) => d.id !== id);
      const changed = data[c].length !== n;
      if (changed) save();
      return changed;
    },
    async removeWhere(c, q) {
      const n = data[c].length;
      data[c] = data[c].filter((d) => !match(d, q));
      if (data[c].length !== n) save();
      return n - data[c].length;
    },
    async count(c, q = {}) {
      return data[c].filter((d) => match(d, q)).length;
    },
    async close() {
      if (timer) flush();
    },
  };
}
