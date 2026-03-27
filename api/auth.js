// OAuth 인증 초기화

export default async function handler(req, res) {
  const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
  const REDIRECT_URI = 'https://bridge34-dashboard-duob.vercel.app/api/auth/callback';
  const SCOPES = 'https://www.googleapis.com/auth/calendar.readonly';

  // 인증 URL 생성
  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&response_type=code&scope=${encodeURIComponent(SCOPES)}&access_type=offline&prompt=consent`;

  // 클라이언트 브라우저로 리다이렉트
  res.redirect(authUrl);
}
