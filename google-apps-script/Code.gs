/**
 * Google Apps Script for Offline Objects forms → Google Sheet
 *
 * Sheet: https://docs.google.com/spreadsheets/d/15ycffCNMmwYmExBdnuI3bMUz96qFxS15ClS5fpChbuU
 *
 * After changing this file: Deploy → Manage deployments → pencil →
 * New version → Deploy. Who has access: Anyone
 *
 * Writes to the first tab in the spreadsheet (leftmost sheet).
 */

var SPREADSHEET_ID = "15ycffCNMmwYmExBdnuI3bMUz96qFxS15ClS5fpChbuU";

function doPost(e) {
  return handle_(e);
}

function doGet(e) {
  return handle_(e);
}

function handle_(e) {
  try {
    const data = parseBody_(e);
    if (!data.form && !data.email) {
      return json_({
        ok: true,
        service: "offline-objects-forms",
        spreadsheetId: SPREADSHEET_ID,
      });
    }

    // Always open by ID so we never write to a different workbook.
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheets()[0];

    if (sheet.getLastRow() === 0) {
      sheet.appendRow([
        "Timestamp",
        "Form",
        "Email",
        "Name",
        "Topic",
        "Message",
      ]);
    }

    sheet.appendRow([
      new Date(),
      String(data.form || ""),
      String(data.email || ""),
      String(data.name || ""),
      String(data.topic || ""),
      String(data.message || ""),
    ]);

    SpreadsheetApp.flush();

    return json_({
      ok: true,
      spreadsheetId: ss.getId(),
      spreadsheetUrl: ss.getUrl(),
      sheet: sheet.getName(),
      row: sheet.getLastRow(),
      email: String(data.email || ""),
    });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  }
}

function parseBody_(e) {
  e = e || {};
  if (e.postData && e.postData.contents) {
    try {
      return JSON.parse(e.postData.contents);
    } catch (err) {
      // fall through
    }
  }
  return e.parameter || {};
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(
    ContentService.MimeType.JSON
  );
}
