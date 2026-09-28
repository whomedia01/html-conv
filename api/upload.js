// 변환한 교안을 서버가 받아 가기 전에 잠시 올려 두는 자리(Vercel Blob).
// 비밀번호가 맞는 요청만 허용하고, 정해진 이름·크기만 받는다. 저장소에는 손대지 않는다.
import { handleUpload } from '@vercel/blob/client';
import { CFG, auth } from './_gh.js';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'POST 요청만 받습니다.' });
  }
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return res.status(503).json({ error: '서버에 임시 저장 공간이 연결되지 않았습니다. 관리자에게 알려 주세요. (Vercel → Storage → Blob 연결 후 재배포)' });
  }
  const c = CFG();
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const json = await handleUpload({
      body,
      request: req,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        let pw = '';
        try { pw = (JSON.parse(clientPayload || '{}') || {}).pw || ''; } catch (e) {}
        const bad = auth(req, pw);
        if (bad) throw new Error(bad.error);
        if (!/^staging\/[a-z0-9-]{6,80}\.txt$/.test(pathname)) throw new Error('잘못된 임시 경로입니다.');
        return {
          allowedContentTypes: ['text/plain'],
          addRandomSuffix: true,
          maximumSizeInBytes: c.maxFile,
          validUntil: Date.now() + 10 * 60 * 1000,
        };
      },
      onUploadCompleted: async () => {},
    });
    return res.status(200).json(json);
  } catch (e) {
    return res.status(400).json({ error: (e && e.message) || '업로드를 준비하지 못했습니다.' });
  }
}
