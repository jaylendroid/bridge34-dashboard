// OAuth Callback - authorization code를 access token으로 교환

export default async function handler(req, res) {
  const { code } = req.query;

  if (!code) {
    return res.status(400).json({ error: 'No authorization code provided' });
  }

  try {
    const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
    const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
    const REDIRECT_URI = 'https://bridge34-dashboard-duob.vercel.app/api/auth/callback';

    // Authorization code를 access token으로 교환
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        redirect_uri: REDIRECT_URI,
        grant_type: 'authorization_code'
      })
    });

    const tokenData = await tokenResponse.json();

    if (!tokenData.access_token) {
      return res.status(401).json({ error: 'Failed to get access token', details: tokenData });
    }

    // Access token을 Supabase에 저장
    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SUPABASE_KEY = process.env.SUPABASE_KEY;

    // 간단한 저장소 (또는 DB에 저장 가능)
    // 지금은 메모리에 저장하거나, 나중에 DB 추가
    global.googleAccessToken = tokenData.access_token;
    global.googleRefreshToken = tokenData.refresh_token;

    // 성공 페이지로 리다이렉트
    res.redirect('/');
  } catch (error) {
    console.error('OAuth callback error:', error);
    res.status(500).json({ error: 'Authentication failed', details: error.message });
  }
}
