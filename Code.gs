// ====================================
// FireAnt Dashboard - Google Apps Script
// ====================================

const SPREADSHEET_ID = '1rxhGTSZC54CtPAwdSR98TgAbvlYzXambMYQUNE6md6M';

// 캘린더 ID 목록 (자동 연동)
const CALENDAR_IDS = [
  'jaylen@bridge34.com',
  'fireant@bridge34.com',
  'official@bridge34.com',
  'sylvie@bridge34.com',
  'ben@bridge34.com',
  'lena@bridge34.com',
  'stanley@bridge34.com',
  'contact@bridge34.com',
];

function doGet() {
  return HtmlService.createHtmlOutputFromFile('index')
    .setTitle('FireAnt Dashboard')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

// ── Tasks ──────────────────────────────────────────────
function getTasks() {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName('Tasks');
    if (!sheet) return [];
    const data = sheet.getDataRange().getValues();
    if (data.length < 2) return [];
    const headers = data[0];
    return data.slice(1).map((row, i) => {
      const obj = { _row: i + 2 };
      headers.forEach((h, j) => { obj[String(h)] = row[j]; });
      return obj;
    }).filter(t => t['Task'] && String(t['Task']).trim() !== '');
  } catch (e) {
    return [];
  }
}

function updateTaskStatus(rowIndex, newStatus) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName('Tasks');
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    const statusCol = headers.indexOf('Status') + 1;
    if (statusCol > 0) {
      sheet.getRange(rowIndex, statusCol).setValue(newStatus);
    }
    return { success: true };
  } catch (e) {
    return { error: e.message };
  }
}

// ── Clients ────────────────────────────────────────────
function getClients() {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName('Clients');
    if (!sheet) return [];
    const data = sheet.getDataRange().getValues();
    if (data.length < 2) return [];
    const headers = data[0];
    return data.slice(1).map(row => {
      const obj = {};
      headers.forEach((h, j) => { obj[String(h)] = row[j]; });
      return obj;
    }).filter(c => c['Client'] && String(c['Client']).trim() !== '');
  } catch (e) {
    return [];
  }
}

// ── Events (Google Calendar 자동 연동) ─────────────────
function getEvents() {
  try {
    const KST_OFFSET = 9 * 60 * 60 * 1000; // UTC+9
    const now = new Date();
    const todayKST = new Date(now.getTime() + KST_OFFSET);

    // 오늘 KST 기준 시작/끝
    const startOfDay = new Date(Date.UTC(
      todayKST.getUTCFullYear(),
      todayKST.getUTCMonth(),
      todayKST.getUTCDate(),
      0, 0, 0
    ) - KST_OFFSET);
    const endOfDay = new Date(Date.UTC(
      todayKST.getUTCFullYear(),
      todayKST.getUTCMonth(),
      todayKST.getUTCDate(),
      23, 59, 59
    ) - KST_OFFSET);

    // 내일 KST 기준 시작/끝
    const startOfTomorrow = new Date(startOfDay.getTime() + 86400000);
    const endOfTomorrow   = new Date(endOfDay.getTime()   + 86400000);

    const seenIds = new Set();
    const todayEvents    = [];
    const tomorrowEvents = [];

    CALENDAR_IDS.forEach(calId => {
      let cal;
      try { cal = CalendarApp.getCalendarById(calId); } catch(e) { return; }
      if (!cal) return;

      // 오늘
      cal.getEvents(startOfDay, endOfDay).forEach(ev => {
        const uid = ev.getId();
        if (seenIds.has(uid)) return;
        seenIds.add(uid);
        todayEvents.push(_formatEvent(ev, KST_OFFSET));
      });

      // 내일
      cal.getEvents(startOfTomorrow, endOfTomorrow).forEach(ev => {
        const uid = ev.getId();
        if (seenIds.has(uid)) return;
        seenIds.add(uid);
        tomorrowEvents.push(_formatEvent(ev, KST_OFFSET));
      });
    });

    todayEvents.sort(_sortByTime);
    tomorrowEvents.sort(_sortByTime);

    return { today: todayEvents, tomorrow: tomorrowEvents };
  } catch (e) {
    return { today: [], tomorrow: [], error: e.message };
  }
}

function _formatEvent(ev, kstOffset) {
  const isAllDay = ev.isAllDayEvent();
  let timeStr = '종일';
  let startTs  = 0;

  if (!isAllDay) {
    const startUTC = ev.getStartTime();
    const startKST = new Date(startUTC.getTime() + kstOffset);
    const h = String(startKST.getUTCHours()).padStart(2, '0');
    const m = String(startKST.getUTCMinutes()).padStart(2, '0');
    timeStr = `${h}:${m}`;
    startTs = startUTC.getTime();
  }

  // Google Meet 링크 추출
  let meetLink = '';
  try {
    const desc = ev.getDescription() || '';
    const loc  = ev.getLocation()    || '';
    const meetRe = /https:\/\/meet\.google\.com\/[a-z]{3}-[a-z]{4}-[a-z]{3}/;
    const m1 = desc.match(meetRe) || loc.match(meetRe);
    if (m1) meetLink = m1[0];
  } catch(e) {}

  return {
    title:    ev.getTitle() || '(제목없음)',
    time:     timeStr,
    allDay:   isAllDay,
    meetLink: meetLink,
    startTs:  startTs,
  };
}

function _sortByTime(a, b) {
  if (a.allDay && !b.allDay) return 1;
  if (!a.allDay && b.allDay) return -1;
  return a.startTs - b.startTs;
}
