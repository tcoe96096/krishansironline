import { StudentTestSubmission } from '../types';
import { GOOGLE_SHEET_WEB_APP_URL } from '../config';

const STORAGE_KEY = 'krishan_sir_student_submissions';
const GOOGLE_SHEET_URL_KEY = 'krishan_sir_google_sheet_url';

// For GitHub Pages, the endpoint is embedded at build time in src/config.ts.
// A local override can be stored on the teacher's own browser for testing.
export const DEFAULT_SHEET_URL = GOOGLE_SHEET_WEB_APP_URL.trim();

export function getGoogleSheetUrl(): string {
  if (typeof window === 'undefined') return DEFAULT_SHEET_URL;
  try {
    const localOverride = localStorage.getItem(GOOGLE_SHEET_URL_KEY)?.trim();
    return localOverride || DEFAULT_SHEET_URL;
  } catch {
    return DEFAULT_SHEET_URL;
  }
}

export function saveGoogleSheetUrl(url: string): void {
  if (typeof window === 'undefined') return;
  try {
    if (url.trim()) localStorage.setItem(GOOGLE_SHEET_URL_KEY, url.trim());
    else localStorage.removeItem(GOOGLE_SHEET_URL_KEY);
  } catch (error) {
    console.warn('Could not store Google Sheets URL in this browser.', error);
  }
}

/**
 * Browser-local backup. These records live only on the device/browser that
 * submitted the test. Use the Apps Script connection for a central register.
 */
export function getLocalSubmissions(): StudentTestSubmission[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error('Failed to parse local submissions', error);
    return [];
  }
}

export function saveLocalSubmission(submission: StudentTestSubmission): void {
  if (typeof window === 'undefined') return;
  try {
    const current = getLocalSubmissions();
    const updated = [submission, ...current.filter((item) => item.id !== submission.id)];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (error) {
    console.error('Failed to save submission to localStorage', error);
  }
}

export function deleteLocalSubmission(id: string): StudentTestSubmission[] {
  if (typeof window === 'undefined') return [];
  try {
    const updated = getLocalSubmissions().filter((item) => item.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    return updated;
  } catch (error) {
    console.error('Failed to delete submission', error);
    return [];
  }
}

export function clearAllLocalSubmissions(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.warn('Could not clear local submissions.', error);
  }
}

/**
 * Save locally first, then optionally send one POST to the teacher's private
 * Google Sheet through Apps Script. `no-cors` means the browser cannot inspect
 * Google's response; the teacher should verify a test row in the Sheet.
 */
export async function sendSubmissionToGoogleSheet(
  submission: StudentTestSubmission,
  customUrl?: string
): Promise<{ success: boolean; message: string }> {
  saveLocalSubmission(submission);
  const targetUrl = customUrl?.trim() || getGoogleSheetUrl();

  if (!targetUrl) {
    return {
      success: true,
      message: 'परिणाम इस डिवाइस के ब्राउज़र में सुरक्षित हुआ है। सभी विद्यार्थियों के परिणाम एक जगह पाने के लिए Google Sheet कनेक्शन सेट करना बाकी है।',
    };
  }

  const remarks = Number(submission.percentage) >= 80
    ? 'बहुत अच्छा! शानदार प्रदर्शन।'
    : Number(submission.percentage) >= 60
      ? 'अच्छा प्रयास! अभ्यास जारी रखें।'
      : 'अच्छा प्रयास। उत्तरों की समीक्षा करें और फिर अभ्यास करें।';

  const payload = {
    action: 'submitTestResult',
    id: submission.id,
    timestamp: submission.timestamp,
    mobile: submission.student.mobile,
    studentName: submission.student.studentName,
    studentClass: submission.student.studentClass,
    rollNo: submission.student.rollNo,
    school: submission.student.school,
    testId: submission.testId,
    testTitle: submission.testTitle,
    score: submission.score,
    totalMarks: submission.totalMarks,
    percentage: submission.percentage,
    attempted: submission.attempted,
    unattempted: submission.unattempted,
    remarks,
    answersSummary: JSON.stringify(submission.answers),
  };

  try {
    await fetch(targetUrl, {
      method: 'POST',
      mode: 'no-cors',
      cache: 'no-cache',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload),
    });

    // The no-cors response is opaque, so we cannot mark the row as verified.
    submission.syncedToGoogleSheet = false;
    saveLocalSubmission(submission);
    return {
      success: true,
      message: 'Google Sheet पर परिणाम भेजने का अनुरोध किया गया है। Google की cross-origin सुरक्षा के कारण वेबसाइट server response नहीं पढ़ सकती; कृपया अपनी Google Sheet में नई पंक्ति देखकर पुष्टि करें।',
    };
  } catch (error) {
    console.error('Google Sheets submission failed; local copy remains saved.', error);
    submission.syncedToGoogleSheet = false;
    submission.syncError = 'Google Sheets तक कनेक्शन नहीं हो सका।';
    saveLocalSubmission(submission);
    return {
      success: false,
      message: 'परिणाम इस डिवाइस में सुरक्षित है, लेकिन Google Sheet तक नहीं पहुँच सका। इंटरनेट और Apps Script URL जाँचें।',
    };
  }
}

/** Export locally cached records for backup. */
export function exportSubmissionsToCSV(submissions: StudentTestSubmission[]): void {
  if (!submissions?.length || typeof document === 'undefined') return;

  const headers = [
    'S.No.', 'Timestamp', 'Roll No', 'Student Name', 'Mobile', 'Class', 'School',
    'Score', 'Total Marks', 'Percentage', 'Attempted', 'Unattempted', 'Test Name',
  ];
  const quote = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`;
  const rows = submissions.map((item, index) => [
    index + 1,
    quote(item.timestamp),
    quote(item.student.rollNo),
    quote(item.student.studentName),
    quote(item.student.mobile),
    quote(item.student.studentClass),
    quote(item.student.school),
    item.score,
    item.totalMarks,
    quote(`${item.percentage}%`),
    item.attempted,
    item.unattempted,
    quote(item.testTitle),
  ]);

  const csv = '\uFEFF' + [headers.join(','), ...rows.map((row) => row.join(','))].join('\r\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `Krishan_Sir_Test_Results_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

/** Ready-to-copy Google Apps Script for the private teacher-owned result sheet. */
export const GOOGLE_APPS_SCRIPT_CODE = `/**
 * KRISHAN SIR - ONLINE TEST RESULT COLLECTOR
 * Bind this script to a Google Sheet, then deploy it as a Web App.
 * It accepts submissions only; it does not expose or read student records.
 */
const SHEET_NAME = 'Test Results';
const HEADERS = [
  'Timestamp', 'Roll No', 'Student Name', 'Mobile', 'Class', 'School',
  'Test ID', 'Test Title', 'Score', 'Total Marks', 'Percentage',
  'Attempted', 'Unattempted', 'Remarks', 'Submission ID', 'Answers JSON'
];

function doGet() {
  return ContentService.createTextOutput('Krishan Sir result collector is ready.');
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    if (!e || !e.postData || !e.postData.contents) {
      throw new Error('Missing submission body');
    }
    const data = JSON.parse(e.postData.contents);
    if (data.action !== 'submitTestResult') throw new Error('Unknown action');
    if (!data.id || !data.studentName || !data.rollNo || !data.testId) {
      throw new Error('Required student or test details are missing');
    }

    const book = SpreadsheetApp.getActiveSpreadsheet();
    if (!book) throw new Error('Bind this Apps Script to a Google Sheet first');
    const sheet = book.getSheetByName(SHEET_NAME) || book.insertSheet(SHEET_NAME);
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(HEADERS);
      sheet.getRange(1, 1, 1, HEADERS.length)
        .setBackground('#075985').setFontColor('#ffffff').setFontWeight('bold');
      sheet.setFrozenRows(1);
    }

    // Prevent accidental duplicate rows for the same submission ID.
    const lastRow = sheet.getLastRow();
    if (lastRow > 1) {
      const recentIds = sheet.getRange(Math.max(2, lastRow - 499), 15, Math.min(500, lastRow - 1), 1)
        .getDisplayValues().flat();
      if (recentIds.includes(String(data.id))) {
        return json_({ status: 'duplicate', message: 'Submission already recorded' });
      }
    }

    sheet.appendRow([
      data.timestamp || new Date().toISOString(),
      String(data.rollNo || ''),
      String(data.studentName || ''),
      String(data.mobile || ''),
      String(data.studentClass || ''),
      String(data.school || ''),
      String(data.testId || ''),
      String(data.testTitle || ''),
      Number(data.score || 0),
      Number(data.totalMarks || 0),
      String(data.percentage || '0'),
      Number(data.attempted || 0),
      Number(data.unattempted || 0),
      String(data.remarks || ''),
      String(data.id),
      String(data.answersSummary || '')
    ]);
    return json_({ status: 'success', message: 'Result recorded' });
  } catch (error) {
    console.error(error);
    return json_({ status: 'error', message: String(error) });
  } finally {
    lock.releaseLock();
  }
}

function json_(value) {
  return ContentService.createTextOutput(JSON.stringify(value))
    .setMimeType(ContentService.MimeType.JSON);
}
`;
