// 링크 기능 상태 점검 (문제 안내용)
export default function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.status(200).json({
    ok: true,
    blob: !!process.env.BLOB_READ_WRITE_TOKEN,
    save: !!process.env.GITHUB_TOKEN,
    repo: process.env.GITHUB_REPO || 'whomedia01/0818',
    time: new Date().toISOString(),
  });
}
