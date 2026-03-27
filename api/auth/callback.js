// OAuth Callback - authorization code를 access token으로 교환

module.exports = async function handler(req, res) {
  const { code } = req.query;

  if (!code) {
    return res.status(400).json({ error: 'No authorization code provided' });
  }

  try {
    const CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '1067733286769-b6u3j8eeou74b1eg078qq8hhtohv72u6.apps.googleusercontent.com';
    const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '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';
    const REDIRECT_URI = 'https://bridge34-dashboard-duob.vercel.app/api/auth/callback';

    if (!CLIENT_ID || !CLIENT_SECRET) {
      return res.status(500).json({ error: 'Google OAuth credentials not found' });
    }

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

    // Access token 반환 (나중에 DB에 저장)
    res.status(200).json({
      success: true,
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      expires_in: tokenData.expires_in,
      message: 'Copy the access_token above and add to GOOGLE_OAUTH_TOKEN environment variable in Vercel'
    });
  } catch (error) {
    console.error('OAuth callback error:', error);
    res.status(500).json({ error: 'Authentication failed', details: error.message });
  }
};
