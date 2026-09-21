// 링크 기능 상태 점검 (문제 안내용)
export default function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.status(200).json({
    ok: true,
    blob: !!process.env.BLOB_READ_WRITE_TOKEN,
    time: new Date().toISOString(),
  });
}
