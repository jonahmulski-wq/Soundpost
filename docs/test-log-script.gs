// Soundpost Test Log — Google Apps Script
// Paste this whole file into Apps Script, then Deploy > New deployment > Web app,
// Execute as: Me, Who has access: Anyone. Copy the web app URL into LOG_URL in test/index.html.
// It can only ADD rows. Nobody can read the Sheet through it.

const SHEET_ID = '1TRXDmGSdGVOnHFjyCQspwJL0gMZP9Qb9zWPosLDZRMY'; // "Soundpost Test Log"
const KEY = 'sp-7Qx2';                                           // must match LOG_KEY in the app

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const d = JSON.parse(e.postData.contents);
    if (d._key !== KEY) return reply('bad key');
    delete d._key;
    const sh = SpreadsheetApp.openById(SHEET_ID).getSheets()[0];
    let head = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
    // New setting the app sends that the Sheet doesn't have yet? Add a column for it,
    // just before "Problem?" so your own Problem/Notes columns stay at the end.
    Object.keys(d).forEach(function (k) {
      if (head.indexOf(k) >= 0) return;
      const p = head.indexOf('Problem?');
      if (p >= 0) { sh.insertColumnBefore(p + 1); sh.getRange(1, p + 1).setValue(k); }
      else { sh.getRange(1, head.length + 1).setValue(k); }
      head = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
    });
    sh.appendRow(head.map(function (h) { return d[h] !== undefined ? d[h] : ''; }));
    return reply('ok');
  } finally {
    lock.releaseLock();
  }
}

function doGet() { return reply('Soundpost test log is running.'); }
function reply(t) { return ContentService.createTextOutput(t); }
