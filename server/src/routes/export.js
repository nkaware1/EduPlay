import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import { config } from '../config.js';
import { wrap } from '../util.js';

const PLAYER_DIR = path.resolve(config.clientDist, '../dist-player');
const MIME = { '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif', '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.ogg': 'audio/ogg', '.mp4': 'video/mp4', '.webm': 'video/webm' };
const MAX_TOTAL = 40 * 1024 * 1024;

// يحوّل روابط /uploads/... داخل المحتوى إلى data: URI ليصبح الملف مستقلًا تمامًا
function inlineMedia(value, state) {
  if (typeof value === 'string') {
    const m = value.match(/^\/uploads\/([\w.-]+)$/);
    if (!m) return value;
    const file = path.join(config.uploadDir, path.basename(m[1]));
    const mime = MIME[path.extname(file).toLowerCase()];
    if (!mime || !fs.existsSync(file)) return value;
    state.total += fs.statSync(file).size;
    if (state.total > MAX_TOTAL) throw Object.assign(new Error('حجم الوسائط في هذا النشاط كبير جدًا للتصدير (الحد 40 ميغابايت)'), { status: 413 });
    return `data:${mime};base64,${fs.readFileSync(file).toString('base64')}`;
  }
  if (Array.isArray(value)) return value.map((v) => inlineMedia(v, state));
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, inlineMedia(v, state)]));
  return value;
}

const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function buildHtml(a) {
  const js = path.join(PLAYER_DIR, 'player.js');
  const css = path.join(PLAYER_DIR, 'player.css');
  if (!fs.existsSync(js)) throw Object.assign(new Error('ملفات المشغّل غير مبنية. نفّذ: npm run build'), { status: 503 });
  const activity = inlineMedia(
    { id: a.id, type: a.type, title: a.title, description: a.description, content: a.content, settings: { ...a.settings, maxAttempts: 0, requireName: false, mode: 'practice' } },
    { total: 0 },
  );
  const data = JSON.stringify(activity).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
  const code = fs.readFileSync(js, 'utf8').replace(/<\/script/gi, '<\\/script');
  const style = fs.existsSync(css) ? fs.readFileSync(css, 'utf8').replace(/<\/style/gi, '<\\/style') : '';
  return `<!doctype html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(a.title || 'نشاط')}</title>
<link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&family=Lalezar&display=swap" rel="stylesheet">
<style>${style}</style>
</head>
<body>
<div id="root"></div>
<script>window.__ACTIVITY__=${data};</script>
<script>${code}</script>
</body>
</html>`;
}

const asciiName = (a) => `activity-${a.id.slice(0, 8)}`;

const DESKTOP_README = `# تطبيق سطح المكتب (Windows / macOS / Linux)

هذه الحزمة تحوّل النشاط إلى برنامج تنفيذي باستخدام Electron.

## المتطلبات
- Node.js 18 أو أحدث (https://nodejs.org)

## تجربة التطبيق
\`\`\`
npm install
npm start
\`\`\`

## إنشاء ملف EXE (ويندوز)
\`\`\`
npm run dist
\`\`\`
سيظهر ملف portable بصيغة exe داخل مجلد dist. لماك: \`npm run dist:mac\` (على جهاز ماك)، ولينكس: \`npm run dist:linux\`.

## بدون تثبيت أي شيء: GitHub Actions
ضع هذا الملف (zip كما هو) في مجلد \`exports/\` داخل مستودع GitHub فيه سير العمل \`build-apps.yml\` (يأتي مع المنصة)، واعمل push. سيُبنى ملف EXE تلقائيًا ويظهر في تبويب Releases.

## ملاحظات
- النشاط يعمل دون إنترنت (عدا فيديو يوتيوب والخطوط إن وُجدت).
- النتائج لا تُرسل لأي خادم في النسخة المستقلة؛ تظهر للطالب فقط.
- بناء EXE يحتاج تنزيل أدوات Electron من الإنترنت أول مرة.
- أيقونة البرنامج هي أيقونة Electron الافتراضية (عطّلنا تعديل الملف التنفيذي لتجنب مشاكل الصلاحيات على ويندوز). لتخصيصها أضف \`build.win.icon\` وأزل \`signAndEditExecutable\`.
- إذا ظهر خطأ \`Cannot create symbolic link\` فشغّل الطرفية كمدير أو فعّل Developer Mode في ويندوز.
`;

const ANDROID_README = `# تطبيق أندرويد (APK)

هذه الحزمة مشروع Capacitor جاهز يغلّف النشاط داخل تطبيق أندرويد.

## المتطلبات
- Node.js 18 أو أحدث
- Android Studio (يتضمن Android SDK) وJDK 17

## الخطوات
\`\`\`
npm install
npx cap add android
npx cap sync android
npx cap open android
\`\`\`
في Android Studio: **Build ‣ Build Bundle(s) / APK(s) ‣ Build APK(s)**.
ملف APK يظهر في: \`android/app/build/outputs/apk/debug/\`.

بدون واجهة: \`cd android && ./gradlew assembleDebug\` (على ويندوز: \`gradlew.bat assembleDebug\`).

## بدون تثبيت أي شيء: GitHub Actions
ضع هذا الملف (zip كما هو) في مجلد \`exports/\` داخل مستودع GitHub فيه سير العمل \`build-apps.yml\` (يأتي مع المنصة)، واعمل push. سيُبنى ملف APK تلقائيًا ويظهر في تبويب Releases.

## ملاحظات
- ملف APK التجريبي (debug) مناسب للتثبيت المباشر على الأجهزة. للنشر على Google Play تحتاج توقيعًا (release) وحساب مطوّر.
- النشاط يعمل دون إنترنت (عدا فيديو يوتيوب والخطوط).
- النتائج لا تُرسل لأي خادم في النسخة المستقلة.
`;

export default function exportRoutes(db, auth) {
  const r = Router();

  r.get('/:id', auth.optional, wrap(async (req, res) => {
    const a = await db.findOne('activities', { id: req.params.id });
    const owner = req.user && (a?.ownerId === req.user.id || req.user.role === 'admin');
    if (!a || !(owner || (a.published && a.isPublic))) return res.status(404).json({ error: 'النشاط غير موجود أو غير متاح للتصدير' });
    const format = req.query.format || 'html';
    const html = buildHtml(a);
    const name = asciiName(a);

    if (format === 'html') {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${name}.html"`);
      return res.send(html);
    }

    let JSZip;
    try { ({ default: JSZip } = await import('jszip')); } catch {
      throw Object.assign(new Error('حزمة jszip غير مثبتة على الخادم. نفّذ: npm run install:all ثم أعد تشغيل الخادم.'), { status: 503, expose: true });
    }
    const zip = new JSZip();
    if (format === 'desktop') {
      zip.file('index.html', html);
      zip.file('main.js', `const { app, BrowserWindow, Menu } = require('electron');
const path = require('path');

function createWindow() {
  const win = new BrowserWindow({
    width: 1100, height: 760, autoHideMenuBar: true,
    webPreferences: { contextIsolation: true, sandbox: true },
  });
  win.loadFile(path.join(__dirname, 'index.html'));
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
}

app.whenReady().then(() => { Menu.setApplicationMenu(null); createWindow(); });
app.on('window-all-closed', () => app.quit());
`);
      zip.file('package.json', JSON.stringify({
        name: 'lamaa-activity', version: '1.0.0', description: 'Standalone educational activity', main: 'main.js', author: 'Lamaa',
        scripts: { start: 'electron .', dist: 'electron-builder --win portable', 'dist:mac': 'electron-builder --mac', 'dist:linux': 'electron-builder --linux AppImage' },
        build: { appId: 'app.lamaa.activity', productName: 'Lamaa Activity', files: ['main.js', 'index.html'], win: { target: ['portable'], signAndEditExecutable: false } },
        devDependencies: { electron: '^31.0.0', 'electron-builder': '^24.13.3' },
      }, null, 2));
      zip.file('README-AR.md', DESKTOP_README);
    } else if (format === 'android') {
      zip.file('www/index.html', html);
      zip.file('package.json', JSON.stringify({
        name: 'lamaa-activity-android', version: '1.0.0', private: true,
        dependencies: { '@capacitor/android': '^6.1.0', '@capacitor/core': '^6.1.0' }, devDependencies: { '@capacitor/cli': '^6.1.0' },
      }, null, 2));
      zip.file('capacitor.config.json', JSON.stringify({ appId: 'app.lamaa.activity', appName: 'Lamaa Activity', webDir: 'www' }, null, 2));
      zip.file('README-AR.md', ANDROID_README);
    } else return res.status(400).json({ error: 'صيغة غير معروفة' });

    const buf = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${name}-${format}.zip"`);
    res.send(buf);
  }));

  return r;
}
