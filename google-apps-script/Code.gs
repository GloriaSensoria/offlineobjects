/**
 * Google Apps Script for Offline Objects forms → Google Sheet
 *
 * Sheet: https://docs.google.com/spreadsheets/d/15ycffCNMmwYmExBdnuI3bMUz96qFxS15ClS5fpChbuU
 *
 * Tabs:
 * - updates → "Responses"
 * - contact → "Contact Us" (gid 1120393047)
 *
 * After changing this file: Deploy → Manage deployments → pencil →
 * New version → Deploy. Who has access: Anyone
 */

var SPREADSHEET_ID = "15ycffCNMmwYmExBdnuI3bMUz96qFxS15ClS5fpChbuU";
var CONTACT_SHEET_ID = 1120393047;
var UPDATES_SHEET_NAME = "Responses";
var CONTACT_SHEET_NAME = "Contact Us";

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

    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const formType = String(data.form || "").toLowerCase();
    const sheet =
      formType === "contact"
        ? getContactSheet_(ss)
        : getUpdatesSheet_(ss);

    if (formType === "contact") {
      ensureHeaders_(sheet, [
        "Timestamp",
        "Name",
        "Email",
        "Topic",
        "Message",
      ]);
      sheet.appendRow([
        new Date(),
        String(data.name || ""),
        String(data.email || ""),
        String(data.topic || ""),
        String(data.message || ""),
      ]);
    } else {
      ensureHeaders_(sheet, ["Timestamp", "Email"]);
      sheet.appendRow([new Date(), String(data.email || "")]);
    }

    SpreadsheetApp.flush();

    return json_({
      ok: true,
      spreadsheetId: ss.getId(),
      spreadsheetUrl: ss.getUrl(),
      sheet: sheet.getName(),
      row: sheet.getLastRow(),
      form: formType,
      email: String(data.email || ""),
    });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  }
}

function getUpdatesSheet_(ss) {
  var sheet = ss.getSheetByName(UPDATES_SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(UPDATES_SHEET_NAME);
  }
  return sheet;
}

function getContactSheet_(ss) {
  var sheet = null;
  try {
    sheet = ss.getSheetById(CONTACT_SHEET_ID);
  } catch (err) {
    sheet = null;
  }
  if (!sheet) {
    sheet = ss.getSheetByName(CONTACT_SHEET_NAME);
  }
  if (!sheet) {
    throw new Error('Contact sheet "' + CONTACT_SHEET_NAME + '" not found');
  }
  return sheet;
}

function ensureHeaders_(sheet, headers) {
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(headers);
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
