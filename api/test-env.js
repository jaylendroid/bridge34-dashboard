// 환경변수 테스트 엔드포인트

module.exports = async function handler(req, res) {
  res.status(200).json({
    test: 'Environment Variables Status',
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID ? 'SET' : 'MISSING',
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET ? 'SET' : 'MISSING',
    SUPABASE_URL: process.env.SUPABASE_URL ? 'SET' : 'MISSING',
    SUPABASE_KEY: process.env.SUPABASE_KEY ? 'SET' : 'MISSING',
    GOOGLE_OAUTH_TOKEN: process.env.GOOGLE_OAUTH_TOKEN ? 'SET' : 'MISSING',
    NODE_ENV: process.env.NODE_ENV,
    timestamp: new Date().toISOString()
  });
};
