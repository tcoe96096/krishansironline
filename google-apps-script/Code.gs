/**
 * KRISHAN SIR — PRIVATE GOOGLE SHEETS BRIDGE
 *
 * Deploy as a Web App executing as the script owner.
 * The web app URL is called ONLY by a trusted server-side function.
 *
 * Script Properties (Project Settings -> Script Properties):
 *   PORTAL_SHARED_SECRET = long random secret (same value in backend secret store)
 *   RESULTS_SHEET_ID     = private spreadsheet ID
 *
 * Never put the shared secret or deployment URL in browser JavaScript.
 */

const RESULT_SHEET_NAME = 'Test Results';
const RESULT_HEADERS = [
  'Submission ID', 'Submitted At', 'Student Name', 'Mobile', 'Class',
  'Roll No', 'School', 'Test ID', 'Test Title', 'Score', 'Total Marks',
  'Percentage', 'Attempted', 'Unattempted', 'Status', 'Teacher Note'
];

function doGet() {
  // Do not expose sheet contents or a public health endpoint.
  return json_({ ok: false, error: 'POST authentication required' });
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    const body = e && e.postData && e.postData.contents
      ? JSON.parse(e.postData.contents)
      : {};
    assertSecret_(body.portalSecret);
    lock.waitLock(10000);

    const action = String(body.action || '');
    if (action === 'health') {
      return json_({ ok: true, service: 'krishan-sir-sheets-bridge' });
    }

    const sheet = getSheet_();
    if (action === 'upsertResult') {
      return json_(upsertResult_(sheet, body.result || {}));
    }
    if (action === 'listResults') {
      return json_(listResults_(sheet, body));
    }
    if (action === 'updateResultStatus') {
      return json_(updateResultStatus_(sheet, body));
    }

    throw new Error('Unsupported action');
  } catch (err) {
    return json_({ ok: false, error: safeMessage_(err) });
  } finally {
    try { lock.releaseLock(); } catch (_) {}
  }
}

function assertSecret_(provided) {
  const expected = PropertiesService.getScriptProperties()
    .getProperty('PORTAL_SHARED_SECRET');
  if (!expected || !provided || !constantTimeEqual_(String(provided), expected)) {
    throw new Error('Unauthorized');
  }
}

function constantTimeEqual_(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function getSheet_() {
  const id = PropertiesService.getScriptProperties().getProperty('RESULTS_SHEET_ID');
  if (!id) throw new Error('RESULTS_SHEET_ID is not configured');
  const book = SpreadsheetApp.openById(id);
  let sheet = book.getSheetByName(RESULT_SHEET_NAME);
  if (!sheet) sheet = book.insertSheet(RESULT_SHEET_NAME);
  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, RESULT_HEADERS.length).setValues([RESULT_HEADERS]);
    sheet.getRange(1, 1, 1, RESULT_HEADERS.length)
      .setBackground('#075985').setFontColor('#ffffff').setFontWeight('bold');
    sheet.setFrozenRows(1);
  } else {
    const existing = sheet.getRange(1, 1, 1, RESULT_HEADERS.length).getDisplayValues()[0];
    if (existing[0] !== RESULT_HEADERS[0]) {
      throw new Error('Unexpected sheet header; refusing to modify this tab');
    }
  }
  return sheet;
}

function upsertResult_(sheet, result) {
  const id = required_(result.submissionId, 'submissionId');
  const values = [
    id,
    safeCell_(result.submittedAt),
    safeCell_(result.studentName),
    safeCell_(result.mobile),
    safeCell_(result.classLevel),
    safeCell_(result.rollNo),
    safeCell_(result.school),
    safeCell_(result.testId),
    safeCell_(result.testTitle),
    finiteNumber_(result.score),
    finiteNumber_(result.totalMarks),
    finiteNumber_(result.percentage),
    finiteNumber_(result.attempted),
    finiteNumber_(result.unattempted),
    safeCell_(result.status || 'Submitted'),
    safeCell_(result.teacherNote)
  ];

  const lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    const ids = sheet.getRange(2, 1, lastRow - 1, 1).getDisplayValues().flat();
    const index = ids.indexOf(id);
    if (index >= 0) {
      sheet.getRange(index + 2, 1, 1, RESULT_HEADERS.length).setValues([values]);
      return { ok: true, action: 'updated', submissionId: id };
    }
  }

  sheet.appendRow(values);
  return { ok: true, action: 'inserted', submissionId: id };
}

function listResults_(sheet, body) {
  const page = Math.max(1, Math.floor(Number(body.page) || 1));
  const pageSize = Math.min(100, Math.max(1, Math.floor(Number(body.pageSize) || 25)));
  const query = String(body.query || '').trim().toLowerCase();
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return { ok: true, rows: [], page: page, pageSize: pageSize, total: 0 };

  const all = sheet.getRange(2, 1, lastRow - 1, RESULT_HEADERS.length).getDisplayValues();
  const filtered = query
    ? all.filter(row => [row[0], row[2], row[3], row[4], row[5], row[6], row[7], row[8]]
        .some(value => String(value).toLowerCase().includes(query)))
    : all;
  const start = (page - 1) * pageSize;
  const rows = filtered.slice(start, start + pageSize).map(rowToObject_);
  return { ok: true, rows: rows, page: page, pageSize: pageSize, total: filtered.length };
}

function rowToObject_(r) {
  return {
    submissionId: r[0], submittedAt: r[1], studentName: r[2],
    mobile: r[3], classLevel: r[4], rollNo: r[5], school: r[6],
    testId: r[7], testTitle: r[8], score: r[9], totalMarks: r[10],
    percentage: r[11], attempted: r[12], unattempted: r[13],
    status: r[14], teacherNote: r[15]
  };
}

function updateResultStatus_(sheet, body) {
  const id = required_(body.submissionId, 'submissionId');
  const status = String(body.status || '');
  if (!['Reviewed', 'Published', 'On Hold', 'Submitted'].includes(status)) {
    throw new Error('Invalid result status');
  }
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) throw new Error('Submission not found');
  const ids = sheet.getRange(2, 1, lastRow - 1, 1).getDisplayValues().flat();
  const index = ids.indexOf(id);
  if (index < 0) throw new Error('Submission not found');
  const row = index + 2;
  sheet.getRange(row, 15).setValue(status);
  sheet.getRange(row, 16).setValue(safeCell_(body.teacherNote));
  return { ok: true, submissionId: id, status: status };
}

function required_(value, field) {
  const text = String(value == null ? '' : value).trim();
  if (!text) throw new Error('Missing ' + field);
  return text;
}

// Avoid spreadsheet formula injection from untrusted student text.
function safeCell_(value) {
  const text = String(value == null ? '' : value).slice(0, 500);
  return /^[=+@\-]/.test(text) ? "'" + text : text;
}

function finiteNumber_(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function safeMessage_(err) {
  const message = err && err.message ? String(err.message) : 'Request failed';
  return message === 'Unauthorized' ? message : message.slice(0, 180);
}

function json_(value) {
  return ContentService.createTextOutput(JSON.stringify(value))
    .setMimeType(ContentService.MimeType.JSON);
}
