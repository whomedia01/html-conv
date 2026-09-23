// 비밀번호가 맞으면 서버에 보관된 GitHub 토큰을 내준다.
// 토큰은 Vercel 환경변수에만 있고, 브라우저에는 저장되지 않는다(메모리에서만 사용).
const WINDOW_MS = 10 * 60 * 1000;   // 10분
const MAX_FAIL = 10;                // 같은 IP 에서 10번 틀리면 잠시 차단
const fails = new Map();

function ipOf(req) {
  const f = req.headers['x-forwarded-for'];
  return (Array.isArray(f) ? f[0] : (f || '')).split(',')[0].trim() || 'unknown';
}
function tooMany(ip) {
  const rec = fails.get(ip);
  if (!rec) return false;
  if (Date.now() - rec.at > WINDOW_MS) { fails.delete(ip); return false; }
  return rec.n >= MAX_FAIL;
}
function noteFail(ip) {
  const rec = fails.get(ip);
  if (!rec || Date.now() - rec.at > WINDOW_MS) fails.set(ip, { n: 1, at: Date.now() });
  else rec.n++;
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const token = process.env.GITHUB_TOKEN || '';
  const pass = process.env.APP_PASSWORD || 'who123';
  const repo = process.env.GITHUB_REPO || 'whomedia01/0818';
  const branch = process.env.GITHUB_BRANCH || 'main';

  if (!token) {
    return res.status(503).json({
      error: '서버에 저장 권한이 설정되지 않았습니다. Vercel 환경변수 GITHUB_TOKEN 을 넣고 다시 배포해 주세요.',
    });
  }

  const ip = ipOf(req);
  if (tooMany(ip)) {
    return res.status(429).json({ error: '비밀번호를 여러 번 틀렸습니다. 10분 뒤에 다시 시도해 주세요.' });
  }

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch (e) { body = {}; } }
  const pw = String((body && body.pw) || '').trim();

  // 길이가 달라도 같은 시간이 걸리도록 한 글자씩 비교
  let ok = pw.length === pass.length;
  for (let i = 0; i < Math.max(pw.length, pass.length); i++) {
    if (pw.charCodeAt(i) !== pass.charCodeAt(i)) ok = false;
  }
  if (!ok) {
    noteFail(ip);
    await new Promise(r => setTimeout(r, 400));   // 무작위 대입 늦추기
    return res.status(401).json({ error: '비밀번호가 맞지 않습니다.' });
  }

  fails.delete(ip);
  return res.status(200).json({ token, repo, branch });
}
