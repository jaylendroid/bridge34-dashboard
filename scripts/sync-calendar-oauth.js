#!/usr/bin/env node
/**
 * Google Calendar → Supabase 동기화
 * Google OAuth Refresh Token 방식 (GitHub Actions용)
 * gog CLI 불필요 — 순수 fetch로 동작
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_API_KEY = process.env.SUPABASE_API_KEY;
const GOOGLE_REFRESH_TOKEN = process.env.GOOGLE_REFRESH_TOKEN;
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;

if (!SUPABASE_URL || !SUPABASE_API_KEY) {
  console.error('❌ SUPABASE_URL, SUPABASE_API_KEY 환경변수 필요');
  process.exit(1);
}
if (!GOOGLE_REFRESH_TOKEN || !GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
  console.error('❌ GOOGLE_REFRESH_TOKEN, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET 환경변수 필요');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_API_KEY);

const CALENDARS = [
  'jaylen@bridge34.com',
  'fireant@bridge34.com',
  'official@bridge34.com',
  'sylvie@bridge34.com',
  'ben@bridge34.com',
  'lena@bridge34.com',
  'stanley@bridge34.com',
  'contact@bridge34.com',
];

async function getAccessToken() {
  console.log('🔑 Google Access Token 갱신 중...');
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      refresh_token: GOOGLE_REFRESH_TOKEN,
      grant_type: 'refresh_token',
    }),
  });
  const data = await res.json();
  if (!data.access_token) {
    console.error('❌ Access Token 갱신 실패:', data);
    throw new Error('Access Token 갱신 실패');
  }
  console.log('✅ Access Token 갱신 완료');
  return data.access_token;
}

async function fetchCalendarEvents(accessToken) {
  const now = new Date();
  const sevenDaysLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const timeMin = now.toISOString();
  const timeMax = sevenDaysLater.toISOString();

  const allEvents = [];
  const seen = new Set();

  for (const cal of CALENDARS) {
    try {
      const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(cal)}/events?` +
        new URLSearchParams({
          timeMin,
          timeMax,
          maxResults: '100',
          singleEvents: 'true',
          orderBy: 'startTime',
          timeZone: 'Asia/Seoul',
        });

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (!res.ok) {
        console.warn(`⚠️  ${cal} 조회 실패 (${res.status})`);
        continue;
      }

      const data = await res.json();
      const items = data.items || [];

      for (const ev of items) {
        if (seen.has(ev.iCalUID)) continue;
        seen.add(ev.iCalUID);
        allEvents.push({
          google_event_id: ev.id,
          ical_uid: ev.iCalUID,
          summary: ev.summary || '제목 없음',
          start_time: ev.start?.dateTime || ev.start?.date,
          end_time: ev.end?.dateTime || ev.end?.date,
          meeting_link:
            ev.hangoutLink ||
            ev.conferenceData?.entryPoints?.find((e) => e.entryPointType === 'video')?.uri ||
            null,
          calendar: cal,
        });
      }

      console.log(`  📅 ${cal}: ${items.length}개`);
    } catch (e) {
      console.warn(`⚠️  ${cal} 오류: ${e.message}`);
    }
  }

  return allEvents;
}

async function upsertEvents(events) {
  if (!events.length) {
    console.log('ℹ️  동기화할 이벤트 없음');
    return;
  }

  const { error } = await supabase
    .from('events')
    .upsert(events, { onConflict: 'google_event_id' });

  if (error) {
    console.error('❌ Supabase upsert 실패:', error.message);
    throw error;
  }

  console.log(`✅ ${events.length}개 이벤트 동기화 완료`);
}

async function main() {
  console.log('🚀 Google Calendar → Supabase 동기화 시작');
  try {
    const token = await getAccessToken();
    console.log('📅 캘린더 이벤트 조회 중...');
    const events = await fetchCalendarEvents(token);
    console.log(`📊 총 ${events.length}개 이벤트 (중복 제거 후)`);
    await upsertEvents(events);
    console.log('🎉 동기화 완료!');
  } catch (e) {
    console.error('❌ 동기화 실패:', e.message);
    process.exit(1);
  }
}

main();
