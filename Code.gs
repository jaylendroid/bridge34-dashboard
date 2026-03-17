function doGet() {
  var today = Utilities.formatDate(new Date(), 'Asia/Seoul', 'yyyy-MM-dd');
  var template = HtmlService.createTemplateFromFile('index');
  template.tasksJson = JSON.stringify(getTasks());
  template.clientsJson = JSON.stringify(getClients());
  template.eventsJson = JSON.stringify(getCalendarEvents(today));
  return template.evaluate()
    .setTitle('Bridge34 Dashboard')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function getClients() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('Clients');
  var data = sheet.getDataRange().getValues();
  var headers = data[0];
  var rows = [];
  for (var i = 1; i < data.length; i++) {
    if (!data[i][0]) continue;
    var row = {_row: i + 1};
    for (var j = 0; j < headers.length; j++) {
      row[headers[j]] = data[i][j];
    }
    rows.push(row);
  }
  return rows;
}

function getTasks() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('Tasks');
  var data = sheet.getDataRange().getValues();
  var headers = data[0];
  var rows = [];
  for (var i = 1; i < data.length; i++) {
    if (!data[i][0]) continue;
    var row = {_row: i + 1};
    for (var j = 0; j < headers.length; j++) {
      var val = data[i][j];
      if (headers[j] === 'Date' || headers[j] === 'Due Date') {
        if (val instanceof Date) {
          val = Utilities.formatDate(val, 'Asia/Seoul', 'yyyy-MM-dd');
        } else {
          val = String(val || '');
        }
      }
      row[headers[j]] = val;
    }
    rows.push(row);
  }
  return rows;
}

function getCalendarEvents(dateStr) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('Events') || ss.getSheetByName('시트1');
  if (!sheet) return [];
  if (sheet.getName() !== 'Events') { sheet.setName('Events'); }
  var data = sheet.getDataRange().getValues();
  if (data.length < 2) return [];
  var result = [];
  for (var i = 1; i < data.length; i++) {
    var date = String(data[i][0] || '');
    if (data[i][0] instanceof Date) {
      date = Utilities.formatDate(data[i][0], 'Asia/Seoul', 'yyyy-MM-dd');
    }
    if (date !== dateStr) continue;
    var time = String(data[i][1] || '');
    var title = String(data[i][2] || '');
    var location = String(data[i][3] || '');
    var allDay = String(data[i][4] || '').toUpperCase() === 'TRUE';
    if (!title) continue;
    result.push({ title: title, time: allDay ? '종일' : time, endTime: '', allDay: allDay, location: location });
  }
  result.sort(function(a, b) {
    if (a.allDay && !b.allDay) return 1;
    if (!a.allDay && b.allDay) return -1;
    return a.time.localeCompare(b.time);
  });
  return result;
}

function addTask(d) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('Tasks');
  var today = Utilities.formatDate(new Date(), 'Asia/Seoul', 'yyyy-MM-dd');
  sheet.appendRow([d.task, d.client, d.assignee, d.status, d.dueDate, d.priority, d.date || today]);
  return getTasks();
}

function deleteTask(rowNum) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('Tasks');
  sheet.deleteRow(rowNum);
  return getTasks();
}

function updateTaskStatus(rowNum, newStatus) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('Tasks');
  sheet.getRange(rowNum, 4).setValue(newStatus);
  return {success: true};
}

function addClient(d) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('Clients');
  sheet.appendRow([d.client, d.category, d.assignee, d.kol, d.community, d.risk, d.invoice||'']);
  return getClients();
}

function updateClient(rowNum, d) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('Clients');
  sheet.getRange(rowNum, 1, 1, 7).setValues([[d.client, d.category, d.assignee, d.kol, d.community, d.risk, d.invoice||'']]);
  return getClients();
}

function getTasksByDateRange(from, to) {
  var all = getTasks();
  return all.filter(function(t) {
    var d = t.Date || '';
    return d >= from && d <= to;
  });
}

// ── Google Calendar 자동 동기화 ──────────────────────

var CALENDAR_IDS = [
  'jaylen@bridge34.com',
  'fireant@bridge34.com',
  'official@bridge34.com',
  'sylvie@bridge34.com',
  'ben@bridge34.com',
  'lena@bridge34.com',
  'stanley@bridge34.com',
  'contact@bridge34.com'
];

function syncCalendarToSheet() {
  var KST = 'Asia/Seoul';
  var now = new Date();
  var todayStr = Utilities.formatDate(now, KST, 'yyyy-MM-dd');
  var rangeStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
  var rangeEnd   = new Date(rangeStart.getTime() + 60 * 24 * 60 * 60 * 1000);
  var seen = {};
  var events = [];
  var meetPattern = 'meet.google.com/';

  CALENDAR_IDS.forEach(function(calId) {
    var cal;
    try { cal = CalendarApp.getCalendarById(calId); } catch(e) { return; }
    if (!cal) return;
    try {
      cal.getEvents(rangeStart, rangeEnd).forEach(function(ev) {
        var uid = ev.getId();
        if (seen[uid]) return;
        seen[uid] = true;
        var isAllDay = ev.isAllDayEvent();
        var startDate = isAllDay
          ? Utilities.formatDate(ev.getAllDayStartDate(), KST, 'yyyy-MM-dd')
          : Utilities.formatDate(ev.getStartTime(), KST, 'yyyy-MM-dd');
        var timeStr = isAllDay ? '' : Utilities.formatDate(ev.getStartTime(), KST, 'HH:mm');
        var meetLink = '';
        var desc = '';
        var loc = '';
        try { desc = ev.getDescription() || ''; } catch(e2) {}
        try { loc  = ev.getLocation()    || ''; } catch(e2) {}
        var combined = desc + ' ' + loc;
        var idx = combined.indexOf(meetPattern);
        if (idx >= 0) {
          var s2 = combined.lastIndexOf('https://', idx);
          if (s2 < 0) s2 = idx - 8;
          var e2 = combined.indexOf(' ', idx + meetPattern.length + 8);
          if (e2 < 0) e2 = combined.length;
          meetLink = combined.substring(s2, e2).trim();
        }
        events.push({
          date: startDate,
          time: timeStr,
          title: ev.getTitle() || '(no title)',
          location: meetLink || loc.substring(0, 100),
          allDay: isAllDay,
          sortKey: startDate + (isAllDay ? 'zz' : timeStr)
        });
      });
    } catch(e) {}
  });

  events.sort(function(a, b) {
    return a.sortKey < b.sortKey ? -1 : a.sortKey > b.sortKey ? 1 : 0;
  });

  var ss    = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('Events') || ss.insertSheet('Events');
  var allData = sheet.getDataRange().getValues();
  var pastRows = [];
  for (var i = 1; i < allData.length; i++) {
    var rowDate = allData[i][0] instanceof Date
      ? Utilities.formatDate(allData[i][0], KST, 'yyyy-MM-dd')
      : String(allData[i][0] || '');
    if (rowDate && rowDate < todayStr) pastRows.push(allData[i]);
  }

  var newData = [['Date', 'Time', 'Title', 'Location', 'AllDay']];
  pastRows.forEach(function(r) { newData.push(r); });
  events.forEach(function(e) {
    newData.push([e.date, e.time, e.title, e.location, e.allDay ? 'TRUE' : 'FALSE']);
  });

  sheet.clearContents();
  sheet.getRange(1, 1, newData.length, 5).setValues(newData);
  return 'synced ' + events.length + ' events';
}

function createHourlyTrigger() {
  ScriptApp.getProjectTriggers().forEach(function(t) {
    if (t.getHandlerFunction() === 'syncCalendarToSheet') {
      ScriptApp.deleteTrigger(t);
    }
  });
  ScriptApp.newTrigger('syncCalendarToSheet')
    .timeBased()
    .everyHours(1)
    .create();
  return 'hourly trigger created';
}
