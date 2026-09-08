const AUDIO_EXTENSIONS = ["opus", "ogg", "mp3", "m4a", "wav", "aac", "amr", "webm"];

const listEl = document.getElementById("clip-list");
const statusEl = document.getElementById("status");
const searchEl = document.getElementById("search");
const refreshBtn = document.getElementById("refresh-btn");
const countEl = document.getElementById("count");
const folderLink = document.getElementById("folder-link");

let allClips = [];

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

function formatDate(iso) {
  try {
    return new Date(iso).toLocaleString("he-IL", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

function mediaUrl(fileId) {
  return `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?alt=media&key=${encodeURIComponent(CONFIG.API_KEY)}`;
}

function renderClips(clips) {
  listEl.innerHTML = "";
  countEl.textContent = clips.length ? `${clips.length} קטעים` : "";

  if (clips.length === 0) {
    listEl.innerHTML = `<p class="empty">לא נמצאו קטעים${searchEl.value ? " התואמים לחיפוש" : " בתיקייה עדיין"}.</p>`;
    return;
  }

  for (const clip of clips) {
    const card = document.createElement("article");
    card.className = "clip-card";

    const info = document.createElement("div");
    info.className = "clip-info";

    const title = document.createElement("h3");
    title.className = "clip-title";
    title.textContent = clip.title;

    const meta = document.createElement("p");
    meta.className = "clip-meta";
    meta.textContent = `${clip.recorder} · ${formatDate(clip.createdTime)}`;

    info.appendChild(title);
    info.appendChild(meta);

    const audio = document.createElement("audio");
    audio.controls = true;
    audio.preload = "none";
    audio.src = mediaUrl(clip.id);

    card.appendChild(info);
    card.appendChild(audio);
    listEl.appendChild(card);
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
