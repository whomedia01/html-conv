// 교안 저장 — 브라우저가 올려 둔 임시 파일을 서버가 검사한 뒤 저장소에 커밋한다.
// 브라우저는 GitHub 토큰을 만지지 않고, 서버는 허용 폴더 밖으로는 쓰지 않는다. 삭제 기능은 없다.
import { CFG, auth, safePath, scan, putFile, gh, readBody, guard } from './_gh.js';

const INDEX_FILE = '_ebook-index.json';
const BLOB_HOST = /(^|\.)public\.blob\.vercel-storage\.com$/i;

export const config = { maxDuration: 60 };

export default async function handler(req, res) {
  if (!guard(req, res)) return;
  const body = readBody(req);
  const bad = auth(req, body.pw);
  if (bad) return res.status(bad.status).json({ error: bad.error });

  const c = CFG();
  const path = safePath(body.path);
  if (!path) {
    return res.status(400).json({ error: '허용되지 않은 저장 경로입니다. 교안은 ' + c.prefix + ' 아래 .html 로만 저장됩니다.' });
  }

  /* 1) 브라우저가 올려 둔 임시 파일 가져오기 (Vercel Blob 만 허용) */
  let url;
  try { url = new URL(String(body.blobUrl || '')); } catch (e) { url = null; }
  if (!url || url.protocol !== 'https:' || !BLOB_HOST.test(url.hostname)) {
    return res.status(400).json({ error: '올바른 임시 파일 주소가 아닙니다.' });
  }
  let html;
  try {
    const r = await fetch(url.href);
    if (!r.ok) throw new Error('HTTP ' + r.status);
    html = await r.text();
  } catch (e) {
    return res.status(400).json({ error: '올려 둔 파일을 읽지 못했습니다. 다시 시도해 주세요.' });
  }

  const size = Buffer.byteLength(html, 'utf8');
  if (!size) return res.status(400).json({ error: '내용이 비어 있습니다.' });
  if (size > c.maxFile) {
    return res.status(413).json({ error: '한 파일 한도를 넘습니다 (' + Math.round(size / 1048576) + 'MB / 한도 ' + Math.round(c.maxFile / 1048576) + 'MB).' });
  }
  if (!/^\s*<!DOCTYPE html/i.test(html) && html.indexOf('<html') < 0) {
    return res.status(400).json({ error: 'HTML 파일이 아닙니다.' });
  }

  /* 2) 저장소 상태 확인 — 개수·총 용량 한도 */
  let s;
  try { s = await scan(); } catch (e) { return res.status(502).json({ error: '저장소를 읽지 못했습니다.' }); }
  const exist = s.files.find(f => f.path === path);
  if (exist && !body.overwrite) {
    return res.status(409).json({ error: '같은 경로에 이미 있습니다.', exists: true, size: exist.size });
  }
  if (!exist && s.count + 1 > c.maxCount) {
    return res.status(409).json({ error: '교안 개수 한도(' + c.maxCount + '개)에 도달했습니다. 관리자에게 정리를 요청해 주세요.' });
  }
  const after = s.total - (exist ? exist.size : 0) + size;
  if (after > c.maxTotal) {
    return res.status(409).json({ error: '저장소 총 용량 한도를 넘습니다. 관리자에게 정리를 요청해 주세요.' });
  }

  /* 3) 커밋 */
  try {
    await putFile(path, html, exist ? exist.sha : null, (exist ? 'update' : 'add') + ' ebook: ' + path);
  } catch (e) {
    return res.status(502).json({ error: '저장하지 못했습니다: ' + (e.message || '') });
  }

  /* 4) 저장 내역 갱신 (실패해도 저장 자체는 성공) */
  const idxPath = c.prefix + INDEX_FILE;
  try {
    let list = [], sha = null;
    try {
      const cur = await gh('/contents/' + idxPath.split('/').map(encodeURIComponent).join('/') + '?ref=' + encodeURIComponent(c.branch));
      sha = cur.sha;
      list = JSON.parse(Buffer.from(cur.content, 'base64').toString('utf8')) || [];
    } catch (e) { if (e.status !== 404) throw e; }
    list = list.filter(x => x && x.path !== path);
    list.unshift({ path, title: String(body.title || '').slice(0, 200), size, at: Date.now() });
    await putFile(idxPath, JSON.stringify(list.slice(0, 500), null, 1), sha, 'chore: update ebook index');
  } catch (e) { /* 무시 */ }

  /* 5) 임시 파일 정리 */
  try {
    const { del } = await import('@vercel/blob');
    await del(url.href);
  } catch (e) { /* 무시 */ }

  return res.status(200).json({ ok: true, path, size, count: s.count + (exist ? 0 : 1), total: after });
}
