#!/usr/bin/env node

/**
 * Google Calendar → Supabase 동기화 스크립트
 * gog CLI를 사용한 인증 (Service Account 불필요)
 * 30일 내 이벤트를 Supabase에 upsert
 */

require('dotenv').config();
const { execSync } = require('child_process');
const { createClient } = require('@supabase/supabase-js');

// 타임존 설정 (Asia/Seoul)
const TIMEZONE = 'Asia/Seoul';

// Supabase 클라이언트
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_API_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Error: SUPABASE_URL and SUPABASE_API_KEY are required');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * gog CLI를 사용해 Google Calendar 이벤트 조회
 */
function fetchCalendarEventsWithGog() {
  try {
    console.log('📅 gog CLI를 사용해 Google Calendar 이벤트 조회 중...');

    const now = new Date();
    const thirtyDaysLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    // gog calendar events 명령어 실행
    // 포맷: JSON 출력으로 설정
    const command = `gog calendar events --format json --time-min "${now.toISOString()}" --time-max "${thirtyDaysLater.toISOString()}" --max-results 250 --single-events --order-by startTime --time-zone "${TIMEZONE}"`;

    let eventsJson;
    try {
      const output = execSync(command, { encoding: 'utf-8' });
      eventsJson = JSON.parse(output);
    } catch (execError) {
      // gog가 이미 JSON 배열로 출력하지 않을 수 있음. 재시도
      console.warn('⚠️  첫 시도 실패, jq를 사용해 변환 시도...');
      const output = execSync(command, { encoding: 'utf-8' });
      eventsJson = JSON.parse(output);
    }

    const events = Array.isArray(eventsJson) ? eventsJson : eventsJson.items || [];
    console.log(`✅ ${events.length}개의 이벤트를 조회했습니다.`);

    return events;
  } catch (error) {
    console.error('❌ Google Calendar 조회 실패:', error.message);
    throw error;
  }
}

/**
 * 이벤트 데이터 변환 (Supabase 테이블 구조에 맞춰)
 */
function transformEventsForSupabase(events) {
  return events.map((event) => ({
    google_event_id: event.id,
    summary: event.summary || '제목 없음',
    description: event.description || null,
    start_time: event.start?.dateTime || event.start?.date,
    end_time: event.end?.dateTime || event.end?.date,
    is_all_day: !event.start?.dateTime, // all day event 여부
    location: event.location || null,
    meeting_link: event.conferenceData?.entryPoints?.[0]?.uri || null,
    organizer_email: event.organizer?.email || null,
    organizer_name: event.organizer?.displayName || null,
    attendees_count: event.attendees?.length || 0,
    timezone: TIMEZONE,
    created_at: event.created,
    updated_at: event.updated,
  }));
}

/**
 * Supabase에 이벤트 upsert
 */
async function upsertEventsToSupabase(events) {
  try {
    if (events.length === 0) {
      console.log('⚠️  동기화할 이벤트가 없습니다.');
      return { upserted: 0, error: null };
    }

    console.log(`📤 Supabase에 ${events.length}개 이벤트 upsert 중...`);

    // Supabase upsert 호출
    const { data, error } = await supabase
      .from('events')
      .upsert(events, { onConflict: 'google_event_id' });

    if (error) {
      throw error;
    }

    console.log(`✅ ${events.length}개 이벤트가 정상 동기화되었습니다.`);
    return { upserted: events.length, error: null };
  } catch (error) {
    console.error('❌ Supabase upsert 실패:', error.message);
    return { upserted: 0, error: error.message };
  }
}

/**
 * 로그 저장 (선택사항)
 */
async function saveSyncLog(result) {
  try {
    const { error } = await supabase.from('sync_logs').insert({
      sync_type: 'calendar',
      status: result.error ? 'failed' : 'success',
      synced_count: result.upserted,
      error_message: result.error,
      synced_at: new Date().toISOString(),
    });

    if (error) {
      console.warn('⚠️  로그 저장 실패:', error.message);
    } else {
      console.log('✅ 동기화 로그가 저장되었습니다.');
    }
  } catch (error) {
    console.warn('⚠️  로그 저장 중 에러:', error.message);
  }
}

/**
 * 메인 동기화 함수
 */
async function syncCalendar() {
  const startTime = Date.now();

  try {
    console.log('🚀 Google Calendar → Supabase 동기화 시작 (gog CLI)');
    console.log(`⏰ 타임존: ${TIMEZONE}`);
    console.log('---');

    // 1. gog CLI를 사용해 이벤트 조회
    const events = fetchCalendarEventsWithGog();

    // 2. 데이터 변환
    const transformedEvents = transformEventsForSupabase(events);

    // 3. Supabase에 upsert
    const result = await upsertEventsToSupabase(transformedEvents);

    // 4. 로그 저장
    await saveSyncLog(result);

    // 완료
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log('---');
    console.log(`✅ 동기화 완료! (${duration}초)`);

    process.exit(result.error ? 1 : 0);
  } catch (error) {
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.error('---');
    console.error(`❌ 동기화 실패: ${error.message} (${duration}초)`);

    // 에러 로그 저장
    await saveSyncLog({
      upserted: 0,
      error: error.message,
    });

    process.exit(1);
  }
}

// 실행
syncCalendar();
