// 교안 조각 올리기 — 큰 교안을 나눠 받아 저장소에 임시 조각(커밋되지 않은 blob)으로 보관한다.
// 별도 임시 저장 공간(Vercel Blob) 없이 동작한다. 조각은 저장 단계에서 하나로 합쳐 커밋한다.
import { auth, gh, readBody, guard } from './_gh.js';

export const config = { maxDuration: 30 };
const MAX_PART = 3 * 1048576;   // 조각 하나 최대 3MB (요청 본문 한도 4.5MB 이내)

export default async function handler(req, res) {
  if (!guard(req, res)) return;
  const body = readBody(req);
  const bad = auth(req, body.pw);
  if (bad) return res.status(bad.status).json({ error: bad.error });

  const b64 = String(body.b64 || '');
  if (!b64 || !/^[A-Za-z0-9+/=]+$/.test(b64)) return res.status(400).json({ error: '조각 형식이 올바르지 않습니다.' });
  const size = Buffer.from(b64, 'base64').length;
  if (!size || size > MAX_PART) return res.status(413).json({ error: '조각 크기가 한도를 넘습니다.' });

  try {
    const r = await gh('/git/blobs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: b64, encoding: 'base64' }),
    });
    return res.status(200).json({ ok: true, sha: r.sha, size });
  } catch (e) {
    return res.status(502).json({ error: '조각을 올리지 못했습니다: ' + (e.message || '') });
  }
}
