# Offline Objects

Landing site for **Offline Objects**. Book one: *Sensoria*.

```bash
python3 -m http.server 5180 --bind 127.0.0.1
```

Open [http://127.0.0.1:5180](http://127.0.0.1:5180).

## Pages

| Page | Path |
|------|------|
| Home | `/` |
| Books & Community | `/books-community.html` |
| Book one · Sensoria | `/book-sensoria.html` |
| Book two | `/book-two.html` |
| Community | `/community.html` |
| About | `/about.html` |
| Contact Us | `/contact.html` |

## Forms → Google Sheet

Email signups (home) and contact messages write rows to a Google Sheet via Apps Script.

### 1. Open your sheet

Use this spreadsheet:
https://docs.google.com/spreadsheets/d/15ycffCNMmwYmExBdnuI3bMUz96qFxS15ClS5fpChbuU

(The Apps Script is already pointed at this sheet ID.)

### 2. Install the script

1. In the sheet: **Extensions → Apps Script**.
2. Replace any default code with the contents of [`google-apps-script/Code.gs`](google-apps-script/Code.gs).
3. Save.

### 3. Deploy as a web app

1. **Deploy → New deployment**.
2. Type: **Web app**.
3. Execute as: **Me**.
4. Who has access: **Anyone**.
5. Deploy and copy the web app URL  
   (it looks like `https://script.google.com/macros/s/…/exec` — not the spreadsheet edit link).

### 4. Connect the site

Paste that **web app** URL into [`form-config.js`](form-config.js):

```js
window.OFFLINE_OBJECTS_FORMS = {
  googleScriptUrl: "https://script.google.com/macros/s/…/exec",
};
```

Each submission appends a row:

- **updates** (home signup) → **Responses** tab: Timestamp · Email  
- **contact** (Contact Us) → **Contact Us** tab (`gid=1120393047`): Timestamp · Name · Email · Topic · Message

After editing `Code.gs` in Apps Script, deploy a **New version** for changes to go live.
