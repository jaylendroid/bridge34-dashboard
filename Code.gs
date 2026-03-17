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

  if (sheet.getName() !== 'Events') {
    sheet.setName('Events');
  }

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
    result.push({
      title: title,
      time: allDay ? '종일' : time,
      endTime: '',
      allDay: allDay,
      location: location
    });
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
