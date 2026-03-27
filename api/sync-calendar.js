// Vercel Serverless Function: Google Calendar → Supabase 동기화

export default async function handler(req, res) {
  try {
    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SUPABASE_KEY = process.env.SUPABASE_KEY;
    const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;

    const CALENDARS = [
      'jaylen@bridge34.com',
      'fireant@bridge34.com',
      'official@bridge34.com',
      'sylvie@bridge34.com',
      'ben@bridge34.com',
      'lena@bridge34.com',
      'stanley@bridge34.com',
      'contact@bridge34.com'
    ];

    // 오늘 날짜 기준 이벤트 조회
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const timeMin = today.toISOString();
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const timeMax = tomorrow.toISOString();

    let allEvents = [];

    // 각 캘린더에서 이벤트 가져오기
    for (const calEmail of CALENDARS) {
      try {
        const response = await fetch(
          `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calEmail)}/events?key=${GOOGLE_API_KEY}&timeMin=${timeMin}&timeMax=${timeMax}&maxResults=50`
        );
        
        if (response.ok) {
          const data = await response.json();
          allEvents = allEvents.concat(data.items || []);
        }
      } catch (err) {
        console.error(`Error fetching ${calEmail}:`, err);
      }
    }

    // 중복 제거 (iCalUID 기준)
    const uniqueMap = new Map();
    allEvents.forEach(e => {
      if (e.iCalUID) {
        uniqueMap.set(e.iCalUID, e);
      }
    });
    const uniqueEvents = Array.from(uniqueMap.values());

    // 시간순 정렬
    uniqueEvents.sort((a, b) => {
      const aTime = new Date(a.start?.dateTime || a.start?.date);
      const bTime = new Date(b.start?.dateTime || b.start?.date);
      return aTime - bTime;
    });

    // Supabase에 동기화
    if (uniqueEvents.length > 0) {
      // 기존 이벤트 삭제
      await fetch(`${SUPABASE_URL}/rest/v1/events`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'apikey': SUPABASE_KEY,
          'Content-Type': 'application/json'
        }
      });

      // 새 이벤트 삽입
      const eventData = uniqueEvents.map(e => ({
        summary: e.summary,
        start_time: e.start?.dateTime || e.start?.date,
        end_time: e.end?.dateTime || e.end?.date,
        meet_link: e.conferenceData?.entryPoints?.[0]?.uri || null,
        calendar_email: e.organizer?.email || 'unknown',
        description: e.description || null
      }));

      await fetch(`${SUPABASE_URL}/rest/v1/events`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'apikey': SUPABASE_KEY,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(eventData)
      });
    }

    res.status(200).json({
      success: true,
      synced: uniqueEvents.length
    });
  } catch (error) {
    console.error('Sync failed:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
