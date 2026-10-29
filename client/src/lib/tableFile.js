// قراءة الجداول: CSV / TSV / نص ملصوق من Excel / ملفات xlsx
export function parseDelimited(text) {
  const t = String(text || '').replace(/^\uFEFF/, '');
  const first = t.split(/\r?\n/).find((l) => l.trim()) || '';
  const count = (ch) => first.split(ch).length - 1;
  const cands = [['\t', count('\t')], [';', count(';')], [',', count(',')], ['،', count('،')]].sort((a, b) => b[1] - a[1]);
  const delim = cands[0][1] > 0 ? cands[0][0] : ',';
  const rows = [];
  let row = [], cell = '', q = false;
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (q) {
      if (c === '"') { if (t[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += c;
    } else if (c === '"' && cell === '') q = true;
    else if (c === delim) { row.push(cell); cell = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && t[i + 1] === '\n') i++;
      row.push(cell); cell = '';
      if (row.some((x) => x.trim() !== '')) rows.push(row);
      row = [];
    } else cell += c;
  }
  row.push(cell);
  if (row.some((x) => x.trim() !== '')) rows.push(row);
  return rows.map((r) => r.map((x) => x.trim()));
}

export async function readTable(file) {
  const name = file.name.toLowerCase();
  if (file.size > 5 * 1024 * 1024) throw new Error('الملف كبير (الحد 5 ميغابايت)');
  if (name.endsWith('.xlsx')) {
    const { default: readXlsxFile } = await import('read-excel-file');
    let rows;
    try { rows = await readXlsxFile(file); } catch {
      throw new Error('تعذّرت قراءة ملف Excel (قد يكون محميًا أو بتنسيق غير معتاد). افتحه في Excel واحفظه بصيغة CSV ثم أعد المحاولة.');
    }
    return rows.map((r) => r.map((c) => (c == null ? '' : c instanceof Date ? c.toISOString().slice(0, 10) : String(c).trim()))).filter((r) => r.some(Boolean));
  }
  if (name.endsWith('.xls')) throw new Error('صيغة xls القديمة غير مدعومة. احفظ الملف بصيغة xlsx أو csv من Excel.');
  return parseDelimited(await file.text());
}

export function toCsv(rows) {
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  return '\uFEFF' + rows.map((r) => r.map(esc).join(',')).join('\r\n');
}
