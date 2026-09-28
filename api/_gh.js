// 서버 전용 공통 모듈 (파일명이 _ 로 시작하면 주소로 열리지 않습니다)
// GitHub 토큰은 이 파일을 쓰는 서버 함수 안에서만 쓰이고, 브라우저로 나가지 않습니다.

export const CFG = () => ({
  token: process.env.GITHUB_TOKEN || '',
  pass: process.env.APP_PASSWORD || 'who123',
  repo: process.env.GITHUB_REPO || 'whomedia01/0818',
  branch: process.env.GITHUB_BRANCH || 'main',
  // 이 폴더 밑에만 쓸 수 있습니다. 다른 경로는 서버가 거부합니다.
  prefix: (process.env.SAVE_PREFIX || 'public/webcontents/').replace(/^\/+/, '').replace(/\/*$/, '/'),
  maxFile: (+process.env.MAX_FILE_MB || 25) * 1048576,
  maxTotal: (+process.env.MAX_TOTAL_MB || 400) * 1048576,
  maxCount: +process.env.MAX_COUNT || 40,
});

const WINDOW_MS = 10 * 60 * 1000, MAX_FAIL = 10;
const fails = new Map();
const ipOf = req => {
  const f = req.headers['x-forwarded-for'];
  return (Array.isArray(f) ? f[0] : (f || '')).split(',')[0].trim() || 'unknown';
};

/** 비밀번호 확인 — 맞으면 null, 틀리면 {status, error} */
export function auth(req, pw) {
  const c = CFG();
  const ip = ipOf(req);
  const rec = fails.get(ip);
  if (rec && Date.now() - rec.at <= WINDOW_MS && rec.n >= MAX_FAIL) {
    return { status: 429, error: '비밀번호를 여러 번 틀렸습니다. 10분 뒤에 다시 시도해 주세요.' };
  }
  const a = String(pw || ''), b = c.pass;
  let ok = a.length === b.length;
  for (let i = 0; i < Math.max(a.length, b.length); i++) if (a.charCodeAt(i) !== b.charCodeAt(i)) ok = false;
  if (!ok) {
    if (!rec || Date.now() - rec.at > WINDOW_MS) fails.set(ip, { n: 1, at: Date.now() });
    else rec.n++;
    return { status: 401, error: '비밀번호가 맞지 않습니다.' };
  }
  fails.delete(ip);
  return null;
}

/** 저장 경로 검사 — 허용 폴더 밑의 .html 만 통과 */
export function safePath(p) {
  const c = CFG();
  const s = String(p || '').replace(/^\/+/, '');
  if (!s || s.length > 300) return null;
  if (s.indexOf('..') >= 0 || s.indexOf('//') >= 0 || /[\\:*?"<>|\u0000-\u001f]/.test(s)) return null;
  if (s.indexOf(c.prefix) !== 0) return null;
  if (!/^[A-Za-z0-9._\-/]+$/.test(s)) return null;
  if (!/\.html$/i.test(s)) return null;
  return s;
}

export async function gh(path, opt) {
  const c = CFG();
  const o = Object.assign({}, opt || {});
  o.headers = Object.assign({
    Authorization: 'Bearer ' + c.token,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'kyoan-converter',
  }, o.headers || {});
  const r = await fetch('https://api.github.com/repos/' + c.repo + path, o);
  if (r.status === 404) { const e = new Error('없음'); e.status = 404; throw e; }
  if (!r.ok) {
    let m = '';
    try { m = (await r.json()).message || ''; } catch (e) {}
    const e = new Error(m || ('GitHub 오류 ' + r.status));
    e.status = r.status;
    throw e;
  }
  return r.status === 204 ? null : r.json();
}

/** 허용 폴더 안의 교안 목록·용량 */
export async function scan() {
  const c = CFG();
  let tree;
  try {
    tree = await gh('/git/trees/' + encodeURIComponent(c.branch) + '?recursive=1');
  } catch (e) {
    if (e.status === 404) return { files: [], total: 0, count: 0 };
    throw e;
  }
  const files = (tree.tree || []).filter(x =>
    x.type === 'blob' && x.path.indexOf(c.prefix) === 0 && /\.html$/i.test(x.path));
  return {
    files: files.map(x => ({ path: x.path, size: x.size || 0, sha: x.sha })),
    total: files.reduce((a, x) => a + (x.size || 0), 0),
    count: files.length,
  };
}

export const toB64 = buf => Buffer.from(buf).toString('base64');

export async function putFile(path, text, sha, message) {
  const c = CFG();
  const body = { message, content: toB64(text), branch: c.branch };
  if (sha) body.sha = sha;
  return gh('/contents/' + path.split('/').map(encodeURIComponent).join('/'), {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

export function readBody(req) {
  let b = req.body;
  if (typeof b === 'string') { try { b = JSON.parse(b); } catch (e) { b = {}; } }
  return b || {};
}

export function guard(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Robots-Tag', 'noindex');
  if (req.method !== 'POST') { res.status(405).json({ error: 'POST 요청만 받습니다.' }); return false; }
  if (!CFG().token) {
    res.status(503).json({ error: '서버에 저장 권한이 설정되지 않았습니다. 관리자에게 알려 주세요.' });
    return false;
  }
  return true;
}
