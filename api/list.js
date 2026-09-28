// 저장된 교안 목록·사용량 (읽기 전용)
import { CFG, auth, scan, readBody, guard } from './_gh.js';

export default async function handler(req, res) {
  if (!guard(req, res)) return;
  const body = readBody(req);
  const bad = auth(req, body.pw);
  if (bad) return res.status(bad.status).json({ error: bad.error });

  const c = CFG();
  try {
    const s = await scan();
    return res.status(200).json({
      ok: true,
      files: s.files.map(f => ({ path: f.path, size: f.size })),
      total: s.total,
      count: s.count,
      limits: { maxFile: c.maxFile, maxTotal: c.maxTotal, maxCount: c.maxCount },
      prefix: c.prefix,
    });
  } catch (e) {
    return res.status(502).json({ error: '저장소를 읽지 못했습니다: ' + (e.message || '') });
  }
}
