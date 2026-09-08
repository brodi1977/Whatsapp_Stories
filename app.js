const AUDIO_EXTENSIONS = ["opus", "ogg", "mp3", "m4a", "wav", "aac", "amr", "webm"];

// אימוג'ים שממופים למילות שורש נפוצות (חיות, אוכל, טבע וכו') כדי לצייר
// "איור" קטן לכל אריח לפי הכותרת. תמיכה בתחיליות עברית (ב/ל/מ/ו/ה/כ/ש)
// נעשית ע"י הסרת אות התחילית מכל מילה בכותרת לפני ההשוואה.
const HEBREW_PREFIXES = ["ה", "ו", "ב", "כ", "ל", "מ", "ש"];

const EMOJI_DICTIONARY = {
  // בעלי חיים
  כלב: "🐶", חתול: "🐱", אריה: "🦁", פיל: "🐘", קוף: "🐵", דוב: "🐻",
  ארנב: "🐰", עכבר: "🐭", סוס: "🐴", פרה: "🐮", כבשה: "🐑", תרנגול: "🐔",
  תרנגולת: "🐔", ברווז: "🦆", ציפור: "🐦", דג: "🐟", כריש: "🦈",
  דולפין: "🐬", לוויתן: "🐳", צב: "🐢", נחש: "🐍", פרפר: "🦋", דבורה: "🐝",
  נמלה: "🐜", עכביש: "🕷️", צפרדע: "🐸", זברה: "🦓", קנגורו: "🦘", ינשוף: "🦉",

  // אוכל
  אבוקדו: "🥑", תפוח: "🍎", בננה: "🍌", ענבים: "🍇", תות: "🍓",
  אבטיח: "🍉", גזר: "🥕", עגבניה: "🍅", פיצה: "🍕", המבורגר: "🍔",
  נקניקיה: "🌭", גלידה: "🍦", עוגה: "🎂", עוגייה: "🍪", שוקולד: "🍫",
  סוכריה: "🍬", לחם: "🍞", ביצה: "🥚", גבינה: "🧀", חלב: "🥛",

  // טבע ומקומות
  ים: "🌊", בריכה: "🏊", יער: "🌲", הר: "⛰️", שמש: "☀️", ירח: "🌙",
  כוכב: "⭐", כוכבים: "✨", ענן: "☁️", גשם: "🌧️", קשת: "🌈", פרח: "🌸",
  עץ: "🌳", חול: "🏖️", אש: "🔥", שלג: "❄️",

  // תחבורה
  מכונית: "🚗", אוטובוס: "🚌", רכבת: "🚂", מטוס: "✈️", ספינה: "🚢",
  אופניים: "🚲", טרקטור: "🚜", רקטה: "🚀",

  // בית ומשפחה
  בית: "🏠", אמא: "👩", אבא: "👨", תינוק: "👶", סבתא: "👵", סבא: "👴",
  מיטה: "🛏️", ספר: "📖",

  // שונות
  לב: "❤️", מוזיקה: "🎵", כדור: "⚽", בלון: "🎈", מסיבה: "🎉",
  מתנה: "🎁", שיניים: "🦷", משקפיים: "👓", כובע: "🎩",
};

const FALLBACK_EMOJIS = ["🎧", "📖", "✨", "🎨", "🎈", "🌟"];

const listEl = document.getElementById("clip-list");
const statusEl = document.getElementById("status");
const searchEl = document.getElementById("search");
const refreshBtn = document.getElementById("refresh-btn");
const countEl = document.getElementById("count");
const folderLink = document.getElementById("folder-link");

let allClips = [];
const player = new Audio();
let activeClipId = null;

function isConfigured() {
  return (
    CONFIG.FOLDER_ID &&
    CONFIG.API_KEY &&
    !CONFIG.FOLDER_ID.startsWith("PUT_") &&
    !CONFIG.API_KEY.startsWith("PUT_")
  );
}

function looksLikeAudio(file) {
  if (file.mimeType && file.mimeType.startsWith("audio/")) return true;
  const ext = (file.name.split(".").pop() || "").toLowerCase();
  return AUDIO_EXTENSIONS.includes(ext);
}

// שם קובץ בפורמט "שם מקליט - נושא" -> { recorder, title }.
// אם אין "-" בשם, כל השם הופך לכותרת והמקליט מסומן "לא ידוע".
function parseFileName(rawName) {
  const withoutExt = rawName.replace(/\.[^./\\]+$/, "");
  const sepIndex = withoutExt.indexOf(" - ");
  if (sepIndex === -1) {
    return { recorder: "לא ידוע", title: withoutExt };
  }
  const recorder = withoutExt.slice(0, sepIndex).trim();
  const title = withoutExt.slice(sepIndex + 3).trim();
  return {
    recorder: recorder || "לא ידוע",
    title: title || withoutExt,
  };
}

function mediaUrl(fileId) {
  return `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?alt=media&key=${encodeURIComponent(CONFIG.API_KEY)}`;
}

// hash יציב ממחרוזת -> מספר, לבחירת צבע/אימוג'י גיבוי עקביים לאותה כותרת.
function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function findEmojis(title) {
  const words = title.split(/[\s,.\-!?"'()]+/).filter(Boolean);
  const found = [];
  for (const word of words) {
    const candidates = [word];
    if (word.length > 2 && HEBREW_PREFIXES.includes(word[0])) {
      candidates.push(word.slice(1));
    }
    for (const candidate of candidates) {
      const emoji = EMOJI_DICTIONARY[candidate];
      if (emoji && !found.includes(emoji)) {
        found.push(emoji);
        break;
      }
    }
    if (found.length >= 3) break;
  }
  if (found.length === 0) {
    found.push(FALLBACK_EMOJIS[hashString(title) % FALLBACK_EMOJIS.length]);
  }
  return found;
}

function tileGradient(title) {
  const hue = hashString(title) % 360;
  return `linear-gradient(135deg, hsl(${hue}, 70%, 58%), hsl(${(hue + 45) % 360}, 70%, 42%))`;
}

function stopPlayback() {
  player.pause();
  if (activeClipId) {
    const prevTile = listEl.querySelector(`[data-clip-id="${activeClipId}"]`);
    setTileUiPlaying(prevTile, false);
  }
  activeClipId = null;
}

function setTileUiPlaying(tile, isPlaying) {
  if (!tile) return;
  tile.classList.toggle("playing", isPlaying);
  if (!isPlaying) {
    const bar = tile.querySelector(".progress-bar");
    if (bar) bar.style.width = "0%";
  }
}

function playClip(clip, tile) {
  if (activeClipId === clip.id) {
    stopPlayback();
    return;
  }
  stopPlayback();
  player.src = mediaUrl(clip.id);
  player.play().catch((err) => console.error("שגיאת ניגון:", err));
  activeClipId = clip.id;
  setTileUiPlaying(tile, true);
}

player.addEventListener("timeupdate", () => {
  if (!activeClipId || !player.duration) return;
  const tile = listEl.querySelector(`[data-clip-id="${activeClipId}"]`);
  const bar = tile && tile.querySelector(".progress-bar");
  if (bar) bar.style.width = `${(player.currentTime / player.duration) * 100}%`;
});

player.addEventListener("ended", stopPlayback);

function renderClips(clips) {
  listEl.innerHTML = "";
  countEl.textContent = clips.length ? `${clips.length} קטעים` : "";

  if (clips.length === 0) {
    listEl.innerHTML = `<p class="empty">לא נמצאו קטעים${searchEl.value ? " התואמים לחיפוש" : " בתיקייה עדיין"}.</p>`;
    return;
  }

  for (const clip of clips) {
    const tile = document.createElement("article");
    tile.className = "tile";
    tile.style.background = tileGradient(clip.title);
    tile.dataset.clipId = clip.id;
    tile.tabIndex = 0;
    tile.setAttribute("role", "button");
    tile.setAttribute("aria-label", `נגן: ${clip.title}`);

    const emojiEl = document.createElement("div");
    emojiEl.className = "tile-emoji";
    emojiEl.textContent = findEmojis(clip.title).join(" ");

    const titleEl = document.createElement("h3");
    titleEl.className = "tile-title";
    titleEl.textContent = clip.title;

    const progressTrack = document.createElement("div");
    progressTrack.className = "progress-track";
    const progressBar = document.createElement("div");
    progressBar.className = "progress-bar";
    progressTrack.appendChild(progressBar);

    tile.appendChild(emojiEl);
    tile.appendChild(titleEl);
    tile.appendChild(progressTrack);

    const toggle = () => playClip(clip, tile);
    tile.addEventListener("click", toggle);
    tile.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        toggle();
      }
    });

    listEl.appendChild(tile);
  }

  if (activeClipId) {
    setTileUiPlaying(listEl.querySelector(`[data-clip-id="${activeClipId}"]`), true);
  }
}

function applyFilter() {
  const q = searchEl.value.trim().toLowerCase();
  if (!q) {
    renderClips(allClips);
    return;
  }
  const filtered = allClips.filter(
    (c) => c.title.toLowerCase().includes(q) || c.recorder.toLowerCase().includes(q)
  );
  renderClips(filtered);
}

async function loadClips() {
  if (!isConfigured()) {
    statusEl.textContent = "";
    listEl.innerHTML = `<p class="empty">האתר עדיין לא מוגדר: יש למלא FOLDER_ID ו-API_KEY בקובץ config.js.</p>`;
    return;
  }

  statusEl.textContent = "טוען קטעים...";
  refreshBtn.disabled = true;

  const params = new URLSearchParams({
    q: `'${CONFIG.FOLDER_ID}' in parents and trashed = false`,
    fields: "files(id,name,createdTime,mimeType)",
    orderBy: "createdTime desc",
    pageSize: "1000",
    key: CONFIG.API_KEY,
  });

  try {
    const res = await fetch(`https://www.googleapis.com/drive/v3/files?${params.toString()}`);
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      throw new Error(body?.error?.message || `שגיאת שרת (${res.status})`);
    }
    const data = await res.json();
    const files = (data.files || []).filter(looksLikeAudio);

    allClips = files.map((f) => {
      const { recorder, title } = parseFileName(f.name);
      return { id: f.id, recorder, title, createdTime: f.createdTime };
    });

    statusEl.textContent = "";
    applyFilter();
  } catch (err) {
    statusEl.textContent = "";
    listEl.innerHTML = `<p class="error">שגיאה בטעינת הקטעים: ${err.message}</p>`;
  } finally {
    refreshBtn.disabled = false;
  }
}

if (isConfigured()) {
  folderLink.href = `https://drive.google.com/drive/folders/${CONFIG.FOLDER_ID}`;
}

searchEl.addEventListener("input", applyFilter);
refreshBtn.addEventListener("click", loadClips);

loadClips();
