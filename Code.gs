// ====================================
// FireAnt Dashboard - Google Apps Script
// ====================================
// 1. 이 파일을 Google Apps Script에 붙여넣기
// 2. SPREADSHEET_ID 를 실제 구글 시트 ID로 교체
// 3. 배포 > 새 배포 > 웹 앱으로 배포
// ====================================

const SPREADSHEET_ID = 'PASTE_YOUR_SHEET_ID_HERE'; // ← 여기 수정

function doGet() {
  return HtmlService.createHtmlOutputFromFile('index')
    .setTitle('FireAnt Dashboard')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

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
