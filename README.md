# קטעי קול — אתר לקבוצת הווטסאפ

אתר סטטי קטן שמציג רשימת הקלטות קוליות מתוך תיקיית Google Drive משותפת,
ומנגן אותן ישירות בדפדפן. אין שרת/בקאנד — Drive משמש גם כאחסון וגם כ"מסד
הנתונים" (שם הקובץ הוא הכותרת + שם המקליט).

## הגדרה חד-פעמית

### 1. תיקיית Google Drive

1. צרו תיקייה חדשה ב-Drive (למשל "קטעי קול - קבוצה").
2. לחצו על התיקייה → **שיתוף** → תחת "גישה כללית" בחרו **"כל מי שיש לו את
   הקישור"** והגדירו הרשאה **עורך** (כדי שכולם יוכלו להעלות קבצים).
3. פתחו את התיקייה בדפדפן והעתיקו את ה-ID מתוך הכתובת:
   `https://drive.google.com/drive/folders/`**`FOLDER_ID`**

> ⚠️ הרשאת "עורך" לכולם אומרת שכל מי שיש לו את הקישור יכול גם למחוק/לשנות
> קבצים של אחרים, לא רק להוסיף. מתאים לקבוצה סגורה שסומכים על החברים בה.

### 2. מפתח API של Google Drive

1. כנסו ל-[Google Cloud Console](https://console.cloud.google.com/).
2. צרו פרויקט חדש (או בחרו קיים).
3. בתפריט **APIs & Services → Library** — חפשו "Google Drive API" ולחצו
   **Enable**.
4. בתפריט **APIs & Services → Credentials** → **Create Credentials → API key**.
5. מומלץ (לא חובה) להגביל את המפתח:
   - **Application restrictions → Websites**: הוסיפו את כתובת האתר שלכם ב-
     GitHub Pages, למשל `https://<username>.github.io/*`.
   - **API restrictions**: הגבילו ל-Google Drive API בלבד.

### 3. מילוי ההגדרות באתר

פתחו את הקובץ [`config.js`](config.js) ומלאו את שני הערכים:

```js
const CONFIG = {
  FOLDER_ID: "...",   // מהשלב 1
  API_KEY: "...",     // מהשלב 2
};
```

זהו — לא צריך לגעת בשום קובץ נוסף. קטעים חדשים שנוספים לתיקייה יופיעו באתר
אוטומטית (עם רענון הדף).

## איך מוסיפים קטע חדש (לחברי הקבוצה)

1. בווטסאפ, על ההקלטה הקולית → **שתפו** (Share) → **Drive**, ובחרו את התיקייה
   המשותפת (או פתחו את התיקייה ישירות ולחצו "העלאה").
2. לפני/אחרי ההעלאה, שנו את שם הקובץ בדרייב לפורמט:
   `שם מקליט - נושא קצר`, למשל: `אהרון - ברכה ליום הולדת`.
   (לא חובה — קובץ בלי הפורמט הזה עדיין יוצג, פשוט עם שם הקובץ הגולמי.)
3. זהו. תוך כמה שניות הקטע יופיע באתר לכולם.

## פריסה ל-GitHub Pages

```bash
git init
git add .
git commit -m "Initial voice clips site"
```

צרו ריפו חדש ב-GitHub (ריק, בלי README) ואז:

```bash
git remote add origin https://github.com/<username>/<repo>.git
git branch -M main
git push -u origin main
```

בהגדרות הריפו ב-GitHub: **Settings → Pages** → Source: **Deploy from a
branch** → Branch: `main` / `/ (root)` → Save. תוך דקה־שתיים האתר יהיה זמין ב-
`https://<username>.github.io/<repo>/`.

## מגבלות ידועות

- **Safari** תומך רק חלקית בקבצי `.opus` (הפורמט הנפוץ של הקלטות ווטסאפ) —
  ייתכן שינגן בבעיות באייפון/מק. Chrome/Edge/Firefox תומכים היטב.
- מפתח ה-API גלוי בקוד הצד-לקוח (זה תקין ומוכר לאפליקציות כאלה) — ההגבלה
  ב-Google Cloud Console (referrer + API restriction) היא קו ההגנה.
