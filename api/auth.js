// OAuth 인증 초기화

module.exports = async function handler(req, res) {
  // 환경변수 로드
  const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
  const REDIRECT_URI = 'https://bridge34-dashboard-duob.vercel.app/api/auth/callback';
  const SCOPES = 'https://www.googleapis.com/auth/calendar.readonly';

  if (!CLIENT_ID) {
    return res.status(500).json({ 
      error: 'GOOGLE_CLIENT_ID not configured',
      message: 'Please set GOOGLE_CLIENT_ID in Vercel Environment Variables'
    });
  }

  // 인증 URL 생성
  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(CLIENT_ID)}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&response_type=code&scope=${encodeURIComponent(SCOPES)}&access_type=offline&prompt=consent`;

  // 클라이언트 브라우저로 리다이렉트
  res.redirect(authUrl);
};
