// 링크 ID → 저장된 교안 파일 주소 조회
import { head, list } from '@vercel/blob';

export default async function handler(req, res) {
  const id = String((req.query && req.query.id) || '');
  if (!/^[A-Za-z0-9-]{6,120}$/.test(id)) return res.status(400).json({ error: '잘못된 링크입니다.' });
  try {
    let url = '';
    try {
      url = (await head(`books/${id}.txt`)).url;
    } catch (e) {
      const r = await list({ prefix: `books/${id}`, limit: 1 });
      url = r.blobs[0] ? r.blobs[0].url : '';
    }
    if (!url) return res.status(404).json({ error: '교안을 찾을 수 없습니다. 링크가 삭제되었거나 주소가 잘못되었습니다.' });
    res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=600');
    return res.status(200).json({ url });
  } catch (e) {
    return res.status(500).json({ error: '교안 정보를 불러오지 못했습니다. 잠시 후 다시 시도하세요.' });
  }
}
