// 웹 링크 게시용 업로드 토큰 발급 (브라우저 → Vercel Blob 직접 업로드)
import { handleUpload } from '@vercel/blob/client';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'POST 요청만 받습니다.' });
  }
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const json = await handleUpload({
      body,
      request: req,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        const required = process.env.PUBLISH_KEY || '';
        let key = '';
        try { key = JSON.parse(clientPayload || '{}').key || ''; } catch (e) { key = ''; }
        if (required && key !== required) throw new Error('게시 비밀번호가 올바르지 않습니다.');
        if (!/^books\/[a-z0-9-]{6,80}\.txt$/.test(pathname)) throw new Error('잘못된 저장 경로입니다.');
        return {
          allowedContentTypes: ['text/plain'],
          addRandomSuffix: true,
          maximumSizeInBytes: 300 * 1024 * 1024,
        };
      },
      onUploadCompleted: async () => {},
    });
    return res.status(200).json(json);
  } catch (e) {
    return res.status(400).json({ error: e && e.message ? e.message : '업로드를 준비하지 못했습니다.' });
  }
}
