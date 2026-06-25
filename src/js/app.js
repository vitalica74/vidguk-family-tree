const TRUST_META = {
  appId: 'VIDGUK_FAMILY_TREE',
  buildId: 'android-offline-local-autobackup-trust-20260319',
  ethosVersion: '1.0',
  publisher: 'Віталій + ChatGPT',
  expectedHash: '630a8fc504b59f5686cd1af41aad360b76b5a4230d6ab482a23f1ffc83b0f3b0'
};
const ETHOS_TEXT = `Проєкт: Відгук — Дерево роду

Цей інструмент створено для вільного й гідного користування.

Принципи довіри:
- Дані належать людині, яка їх внесла.
- Експорт та імпорт мають лишатися відкритими.
- Фото й родинні дані не повинні передаватися назовні без явної дії користувача.
- Базова функціональність не повинна ставати платною пасткою.
- Модифікації мають бути позначені чесно, без видавання себе за оригінал.

Оригінальна збірка показує свій статус довіри у верхній панелі.
Якщо статус змінено на «Модифікована», користувачеві варто перевірити джерело файлу.`;
let trustState = {
  status: 'checking',
  hash: '',
  checkedAt: '',
  message: 'Перевірка збірки…',
  protectedBlockFound: false
};

function normalizeTrustSource(text) {
  return String(text || '').replace(/\r?\n/g, '\n').trim();
}


async function sha256Hex(text) {
  const data = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function getTrustBadgeClass(status) {
  if (status === 'original') return 'badge trust-ok';
  if (status === 'local') return 'badge trust-warn';
  if (status === 'modified') return 'badge trust-err';
  return 'badge trust-warn';
}

function buildTrustManifest(extra = {}) {
  return {
    appId: TRUST_META.appId,
    buildId: TRUST_META.buildId,
    publisher: TRUST_META.publisher,
    ethosVersion: TRUST_META.ethosVersion,
    expectedHash: TRUST_META.expectedHash,
    actualHash: trustState.hash || '',
    verificationStatus: trustState.status,
    verificationMessage: trustState.message,
    checkedAt: trustState.checkedAt || '',
    ...extra
  };
}

function updateTrustBadgeUI() {
  const badge = document.getElementById('trustBadge');
  if (!badge) return;
  badge.className = getTrustBadgeClass(trustState.status);
  let title = '🛡 Перевірка збірки…';
  if (trustState.status === 'original') title = '🛡 Оригінальна збірка';
  else if (trustState.status === 'local') title = '🛡 Локальна збірка';
  else if (trustState.status === 'modified') title = '🛡 Модифікована збірка';
  else if (trustState.status === 'unverified') title = '🛡 Локальна збірка';
  badge.innerHTML = `${title}<br><small>${trustState.message}</small>`;
}

function renderTrustDialog() {
  const statusEl = document.getElementById('trustStatusLine');
  const metaEl = document.getElementById('trustBuildMeta');
  const ethosEl = document.getElementById('trustEthos');
  if (statusEl) {
    statusEl.textContent = `${trustState.status === 'original' ? 'Оригінальна збірка' : trustState.status === 'modified' ? 'Модифікована збірка' : 'Локальна збірка'} — ${trustState.message}`;
  }
  if (metaEl) {
    metaEl.innerHTML =
      `Build: <b>${TRUST_META.buildId}</b><br>` +
      `Publisher: <b>${TRUST_META.publisher}</b><br>` +
      `Expected hash: <code>${TRUST_META.expectedHash}</code><br>` +
      `Actual hash: <code>${trustState.hash || '—'}</code><br>` +
      `Checked at: <b>${trustState.checkedAt || 'ще не перевірено'}</b>`;
  }
  if (ethosEl) ethosEl.textContent = ETHOS_TEXT;
}

function openTrustDialog() {
  renderTrustDialog();
  const modal = document.getElementById('trustModal');
  if (modal) modal.style.display = 'flex';
}

function closeTrustDialog() {
  const modal = document.getElementById('trustModal');
  if (modal) modal.style.display = 'none';
}

async function copyTrustReport() {
  const report = JSON.stringify(buildTrustManifest({ ethos: ETHOS_TEXT }), null, 2);
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(report);
      alert('Звіт довіри скопійовано.');
      return;
    }
  } catch (err) {}
  alert(report);
}

async function verifyOriginalBuild() {
  try {
    const script = document.getElementById('appScript');
    if (!script) throw new Error('script-not-found');
    const raw = script.textContent || '';
    const startMark = '/* TRUSTED_APP_START */';
    const endMark = '/* TRUSTED_APP_END */';
    const start = raw.indexOf(startMark);
    const end = raw.indexOf(endMark);
    if (start === -1 || end === -1 || end <= start) throw new Error('protected-block-not-found');
    const protectedText = normalizeTrustSource(raw.slice(start + startMark.length, end));
    const hash = await sha256Hex(protectedText);
    trustState.hash = hash;
    trustState.checkedAt = new Date().toLocaleString('uk-UA');
    trustState.protectedBlockFound = true;
    if (hash === TRUST_META.expectedHash) {
      trustState.status = 'original';
      trustState.message = 'Захищений блок коду збігається з еталонним підписом.';
    } else {
      trustState.status = 'local';
      trustState.message = 'Ця версія змінена або зібрана локально. Довіра визначається вами.';
    }
  } catch (err) {
    trustState.status = 'local';
    trustState.message = 'Ця версія створена або змінена локально. Довіра визначається вами.';
    trustState.checkedAt = new Date().toLocaleString('uk-UA');
  }
  updateTrustBadgeUI();
  renderTrustDialog();
}

/* TRUSTED_APP_START */
const STORAGE_KEY = 'family_tree_safe_state_v1';
const SNAPSHOT_KEY = 'family_tree_safe_snapshots_v1';
const MAX_SNAPSHOTS = 7;
const APP_VERSION = 5;
const HANDLE_DB_NAME = "family_tree_handles_v1";
const HANDLE_STORE = "handles";
const HANDLE_KEY = "linked-json";
const PHOTOS_HANDLE_KEY = "linked-photos-json";
const PHOTOS_STORAGE_KEY = "family-tree-photos-state-v1";

let state = loadInitialState();
let photosState = normalizePhotosState(loadInitialPhotosState());
let scale = 0.8, posX = 0, posY = 0;
let isDragging = false, lastX = 0, lastY = 0, lastTouchDist = 0;
let connectorFrame = 0;
let familyWidthCache = new Map();
let curCb = null;
let linkedJsonName = state.meta?.linkedJsonName || '';
let linkedJsonHandle = null;
let projectDirHandle = null;
let photosDirHandle = null;
let linkedPhotosName = '';
let linkedPhotosHandle = null;
let handleRestoreTried = false;
let mirrorSaveTimer = null;
let mirrorSaveBusy = false;
let currentModalPersonId = null;
let currentModalFamilyId = null;
let pendingPhotoBlob = null;
let pendingPhotoId = '';
let modalOriginalPhotoId = '';
let modalPhotoChanged = false;
let modalPhotoSaved = false;
let autoBackupBusy = false;
let pendingMerge = null;
const photoUrlCache = new Map();

// layout constants for centered family rendering
const PERSON_CARD_WIDTH = 148;
const COUPLE_GAP = 10;
const CHILDREN_GAP = 28;

const treeEl = document.getElementById('tree');
const view = document.getElementById('viewport');
function resizeViewport() {
  const toolbar = document.querySelector('.toolbar');
  const signatureBar = document.getElementById('signatureBar');
  if (!view || !toolbar) return;
  const toolbarHeight = toolbar.offsetHeight || 0;
  const footerHeight = signatureBar ? (signatureBar.offsetHeight || 0) : 0;
  const nextHeight = Math.max(220, window.innerHeight - toolbarHeight - footerHeight);
  view.style.height = nextHeight + 'px';
}
window.addEventListener('resize', resizeViewport);
window.addEventListener('orientationchange', resizeViewport);
setTimeout(resizeViewport, 0);
const badgeEl = document.getElementById('saveStateBadge');
updateProjectStatusUI();

function defaultState() {
  return {
    meta: {
      version: APP_VERSION,
      projectName: 'Моє дерево',
      updatedAt: new Date().toISOString(),
      linkedJsonName: '',
      dirty: false,
      lastExportAt: '',
      checksum: ''
    },
    persons: {},
    families: {},
    homeId: ''
  };
}

function loadInitialState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return defaultState();
  try {
    const parsed = JSON.parse(raw);
    return normalizeState(parsed);
  } catch (err) {
    const recovered = tryRecoverFromSnapshot();
    return recovered || defaultState();
  }
}

function tryRecoverFromSnapshot() {
  const snapshots = getSnapshots();
  for (const snap of snapshots) {
    try {
      return normalizeState(JSON.parse(snap.payload));
    } catch (err) {}
  }
  return null;
}

function getSnapshots() {
  try {
    const arr = JSON.parse(localStorage.getItem(SNAPSHOT_KEY) || '[]');
    return Array.isArray(arr) ? arr : [];
  } catch (err) {
    return [];
  }
}

function setSnapshots(arr) {
  localStorage.setItem(SNAPSHOT_KEY, JSON.stringify(arr.slice(0, MAX_SNAPSHOTS)));
}

function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(reader.error || new Error('Не вдалося прочитати blob'));
    reader.readAsDataURL(blob);
  });
}

function dataUrlToBlob(dataUrl) {
  const [meta, data] = String(dataUrl || '').split(',');
  if (!meta || !data) return null;
  const mimeMatch = meta.match(/data:([^;]+);base64/i);
  const mime = mimeMatch ? mimeMatch[1] : 'application/octet-stream';
  const binary = atob(data);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

async function cachePhotoBlob(photoId, blob, mime = 'image/webp') {
  if (!photoId || !blob) return '';
  const old = photoUrlCache.get(photoId);
  if (old) {
    try { URL.revokeObjectURL(old); } catch (err) {}
  }
  const url = URL.createObjectURL(blob);
  photoUrlCache.set(photoId, url);
  photosState.photos[photoId] = {
    dataUrl: await blobToDataUrl(blob),
    mime,
    updatedAt: Date.now()
  };
  localStorage.setItem(PHOTOS_STORAGE_KEY, JSON.stringify(normalizePhotosState(photosState)));
  return url;
}

function clearCachedPhoto(photoId) {
  if (!photoId) return;
  const old = photoUrlCache.get(photoId);
  if (old) {
    try { URL.revokeObjectURL(old); } catch (err) {}
    photoUrlCache.delete(photoId);
  }
  if (photosState.photos && photosState.photos[photoId]) {
    delete photosState.photos[photoId];
    localStorage.setItem(PHOTOS_STORAGE_KEY, JSON.stringify(normalizePhotosState(photosState)));
  }
}

async function getPhotoBlobById(photoId) {
  if (!photoId) return null;
  const entry = photosState.photos && photosState.photos[photoId];
  if (entry) {
    if (typeof entry === 'string') return dataUrlToBlob(entry);
    if (entry.dataUrl) return dataUrlToBlob(entry.dataUrl);
  }
  if (photosDirHandle) {
    const names = [`${photoId}.webp`, `${photoId}.jpg`, `${photoId}.jpeg`, `${photoId}.png`];
    for (const name of names) {
      try {
        const fh = await photosDirHandle.getFileHandle(name);
        const file = await fh.getFile();
        await cachePhotoBlob(photoId, file, file.type || 'image/webp');
        return file;
      } catch (err) {}
    }
  }
  return null;
}

async function restorePhotoCacheFromState() {
  const photoIds = new Set(Object.values(state.persons || {}).map(p => p && p.photoId).filter(Boolean));
  for (const photoId of photoIds) {
    if (photoUrlCache.has(photoId)) continue;
    const blob = await getPhotoBlobById(photoId);
    if (blob && !photoUrlCache.has(photoId)) {
      photoUrlCache.set(photoId, URL.createObjectURL(blob));
    }
  }
}

function safeText(v) {
  return String(v == null ? '' : v);
}

function safeNamePart(v) {
  return safeText(v).trim();
}

function composeDisplayName(person) {
  const first = safeNamePart(person?.firstName || person?.name || '');
  const last = safeNamePart(person?.lastName || '');
  return (first + ' ' + last).trim() || first || safeText(person?.name || 'Без імені');
}

function extractYear(value) {
  const text = safeText(value).trim();
  if (!text) return '';
  const m = text.match(/(?:^|\D)(\d{4})(?:\D|$)/);
  return m ? m[1] : '';
}

function formatLifeInfo(person) {
  const birthYear = extractYear(person?.birth);
  const deathYear = extractYear(person?.death);
  const status = safeText(person?.deathStatus || '').trim();
  const lines = [];

  if (birthYear && deathYear) lines.push(`${birthYear}–${deathYear}`);
  else if (birthYear) lines.push(`${birthYear} —`);
  else if (deathYear) lines.push(`— ${deathYear}`);

  if (status) lines.push(status);
  return lines.join('\n');
}

function formatYearsShort(person) {
  return formatLifeInfo(person);
}

function buildPersonRecord(id, p = {}) {
  let firstName = safeNamePart(p.firstName || p.name || '');
  let lastName = safeNamePart(p.lastName || '');
  let maidenName = safeNamePart(p.maidenName || '');
  if (!maidenName && /^\([^)]+\)$/.test(lastName) && firstName.split(/\s+/).length > 1) {
    maidenName = safeNamePart(lastName.replace(/[()]/g, ''));
    const parts = firstName.split(/\s+/).filter(Boolean);
    lastName = safeNamePart(parts.pop() || '');
    firstName = safeNamePart(parts.join(' '));
  }
  const birth = normalizeGedcomDate(safeText(p.birth || '').trim());
  const death = normalizeGedcomDate(safeText(p.death || '').trim());
  const deathStatus = safeText(p.deathStatus || '').trim();
  const note = safeText(p.note || '').trim();
  const gender = normalizeGender(p.gender);
  return {
    id,
    firstName: firstName || 'Без імені',
    lastName,
    maidenName,
    gender,
    birth,
    death,
    deathStatus,
    note,
    photoId: safeText(p.photoId || '').trim(),
    importKeys: Array.isArray(p.importKeys) ? p.importKeys.map(safeText).filter(Boolean) : []
  };
}

function defaultPhotosState() {
  return {
    meta: { version: APP_VERSION, linkedPhotosJsonName: '', updatedAt: new Date().toISOString() },
    photos: {}
  };
}

function normalizePhotosState(input) {
  const next = defaultPhotosState();
  if (!input || typeof input !== 'object') return next;
  next.meta = { ...next.meta, ...(input.meta || {}) };
  const photos = input.photos && typeof input.photos === 'object' ? input.photos : {};
  for (const [key, value] of Object.entries(photos)) {
    if (typeof value === 'string') next.photos[key] = value;
    else if (value && typeof value === 'object') next.photos[key] = value;
  }
  next.meta.updatedAt = new Date().toISOString();
  next.meta.linkedPhotosJsonName = safeText(next.meta.linkedPhotosJsonName || '');
  return next;
}

function loadInitialPhotosState() {
  const raw = localStorage.getItem(PHOTOS_STORAGE_KEY);
  if (!raw) return defaultPhotosState();
  try { return normalizePhotosState(JSON.parse(raw)); } catch (err) { return defaultPhotosState(); }
}

function uid(prefix='id') {
  return prefix + '_' + Math.random().toString(36).slice(2, 11);
}

function simpleHash(str) {
  let h = 5381;
  for (let i = 0; i < str.length; i++) h = ((h << 5) + h) ^ str.charCodeAt(i);
  return (h >>> 0).toString(16).padStart(8, '0');
}

function normalizeImportKeyPart(value) {
  return normalizeMatchText(value || '').replace(/\s+/g, '_') || 'unknown';
}

function makeImportKey(sourceKey, id) {
  return `${normalizeImportKeyPart(sourceKey)}:${safeText(id || '').trim()}`;
}

function getMergeSourceKeys(payload) {
  const keys = [
    payload?.sourceKey,
    payload?.stableSourceKey,
    payload?.fileName,
    payload?.state?.meta?.projectName,
    payload?.state?.homeId
  ].map(safeText).map(value => value.trim()).filter(Boolean);
  return Array.from(new Set(keys));
}

function makeImportKeys(sourceKeys, id) {
  return (sourceKeys || []).map(sourceKey => makeImportKey(sourceKey, id)).filter(Boolean);
}

function addImportKey(record, importKey) {
  if (!record || !importKey) return false;
  const keys = Array.isArray(record.importKeys) ? record.importKeys : [];
  if (keys.includes(importKey)) {
    record.importKeys = keys;
    return false;
  }
  record.importKeys = keys.concat(importKey);
  return true;
}

function addImportKeys(record, importKeys) {
  let changed = false;
  (importKeys || []).forEach(importKey => {
    if (addImportKey(record, importKey)) changed = true;
  });
  return changed;
}

function findRecordByImportKey(records, importKey) {
  if (!importKey) return null;
  return Object.values(records || {}).find(record => Array.isArray(record.importKeys) && record.importKeys.includes(importKey)) || null;
}

function findRecordByImportKeys(records, importKeys) {
  for (const importKey of (importKeys || [])) {
    const found = findRecordByImportKey(records, importKey);
    if (found) return found;
  }
  return null;
}

function normalizeGender(v) {
  if (v === 'M' || v === 'male') return 'male';
  if (v === 'F' || v === 'female') return 'female';
  return 'unknown';
}

function normalizeState(input) {
  const next = defaultState();
  if (!input || typeof input !== 'object') return next;
  next.meta = { ...next.meta, ...(input.meta || {}) };
  next.homeId = typeof input.homeId === 'string' ? input.homeId : '';

  const personsIn = input.persons && typeof input.persons === 'object' ? input.persons : {};
  for (const [id, p] of Object.entries(personsIn)) {
    if (!p || typeof p !== 'object') continue;
    next.persons[id] = buildPersonRecord(id, p);
  }

  const familiesIn = input.families && typeof input.families === 'object' ? input.families : {};
  for (const [id, f] of Object.entries(familiesIn)) {
    if (!f || typeof f !== 'object') continue;
    const adults = Array.isArray(f.adults) ? f.adults.filter(pid => next.persons[pid]) : [];
    const children = Array.isArray(f.children)
      ? f.children
          .map(c => typeof c === 'string' ? { personId: c } : c)
          .filter(c => c && next.persons[c.personId])
          .map(c => {
            const child = { personId: c.personId };
            const anchor = c.parentAdultId || c.anchorAdultId || c.sourceAdultId || c.partnerId || '';
            if (anchor && next.persons[anchor]) child.parentAdultId = anchor;
            return child;
          })
      : [];
    if (!adults.length && !children.length) continue;
    const importKeys = Array.isArray(f.importKeys) ? f.importKeys.map(safeText).filter(Boolean) : [];
    const partnerStatus = (f.partnerStatus === 'divorced' || f.relationshipStatus === 'divorced') ? 'divorced' : 'married';
    const partnerStatuses = (f.partnerStatuses && typeof f.partnerStatuses === 'object') ? { ...f.partnerStatuses } : {};
    next.families[id] = { id, adults, children, importKeys, partnerStatus, partnerStatuses };
  }

  if (!next.homeId || !next.families[next.homeId]) {
    next.homeId = Object.keys(next.families)[0] || '';
  }

  validateStateOrThrow(next);
  next.meta.version = APP_VERSION;
  next.meta.updatedAt = new Date().toISOString();
  next.meta.linkedJsonName = safeText(next.meta.linkedJsonName || '');
  next.meta.checksum = computeStateChecksum(next);
  return next;
}

function validateStateOrThrow(candidate) {
  if (!candidate || typeof candidate !== 'object') throw new Error('Невірний стан');
  if (!candidate.persons || typeof candidate.persons !== 'object') throw new Error('Немає persons');
  if (!candidate.families || typeof candidate.families !== 'object') throw new Error('Немає families');

  for (const [pid, p] of Object.entries(candidate.persons)) {
    if (!p || p.id !== pid) throw new Error('Некоректна особа: ' + pid);
    if (!['male','female','unknown'].includes(p.gender)) throw new Error('Некоректна стать: ' + pid);
  }

  for (const [fid, f] of Object.entries(candidate.families)) {
    if (!f || f.id !== fid) throw new Error('Некоректна родина: ' + fid);
    if (!Array.isArray(f.adults) || !Array.isArray(f.children)) throw new Error('Некоректні масиви в родині: ' + fid);
    f.adults.forEach(pid => { if (!candidate.persons[pid]) throw new Error('Відсутній дорослий ' + pid); });
    f.children.forEach(c => { if (!c || !candidate.persons[c.personId]) throw new Error('Відсутня дитина в родині ' + fid); });
  }

  const parentCount = {};
  for (const f of Object.values(candidate.families)) {
    for (const c of f.children) {
      parentCount[c.personId] = (parentCount[c.personId] || 0) + 1;
    }
  }
  const duplicates = Object.entries(parentCount).filter(([, n]) => n > 1);
  if (duplicates.length) throw new Error('Особа не може бути дитиною у кількох родах: ' + duplicates[0][0]);
}

function computeStateChecksum(candidate) {
  const copy = deepClone(candidate);
  if (!copy.meta) copy.meta = {};
  delete copy.meta.checksum;
  return simpleHash(JSON.stringify(copy));
}

function commitState(next, options = {}) {
  const normalized = normalizeState(next);
  normalized.meta.dirty = !!options.markDirty;
  normalized.meta.updatedAt = new Date().toISOString();
  if (typeof options.linkedJsonName === 'string') normalized.meta.linkedJsonName = options.linkedJsonName;
  normalized.meta.checksum = computeStateChecksum(normalized);

  const prevRaw = localStorage.getItem(STORAGE_KEY);
  if (prevRaw) {
    const snapshots = getSnapshots();
    snapshots.unshift({ ts: new Date().toISOString(), payload: prevRaw });
    setSnapshots(snapshots);
  }

  const payload = JSON.stringify(normalized);
  localStorage.setItem(STORAGE_KEY, payload);
  photosState = normalizePhotosState(photosState);
  localStorage.setItem(PHOTOS_STORAGE_KEY, JSON.stringify(photosState));
  state = normalized;
  linkedJsonName = normalized.meta.linkedJsonName || linkedJsonName || '';
  render();
  updateSaveBadge('ok', options.statusText || "Збережено в пам'яті браузера");
  scheduleMirrorSave();
}

function withDraft(mutator, statusText) {
  const draft = deepClone(state);
  mutator(draft);
  commitState(draft, { markDirty: true, statusText });
}

function updateSaveBadge(mode, text) {
  badgeEl.className = 'badge ' + (mode || '');
  badgeEl.textContent = text || "Пам'ять браузера";
  updateProjectStatusUI();
}

function updateProjectStatusUI() {
  badgeEl.className = 'badge ok';
  badgeEl.innerHTML = "✅ Локальний режим<br><small>дані й фото зберігаються у браузері; авторезерв створюється автоматично, для переносу використовуй ZIP</small>";
}

async function confirmReplaceBrowserTree(actionText = 'замінити дерево') {
  if (!isMeaningfulProject(state)) return true;
  await saveAutoBackup('before-replace-tree');
  return confirm(
    `Увага: дія «${actionText}» замінить поточне дерево в пам'яті браузера.\n\n` +
    'Перед цим дуже бажано натиснути «Експорт ZIP» і зберегти окрему копію дерева разом із фото.\n\n' +
    'Внутрішній авторезерв створено, але ZIP надійніший для переносу й відновлення.\n\n' +
    'Продовжити без Експорт ZIP?'
  );
}

function scheduleMirrorSave() {
  if (!linkedJsonHandle) return;
  if (mirrorSaveBusy) return;
  clearTimeout(mirrorSaveTimer);
  mirrorSaveTimer = setTimeout(() => { saveJsonMirror(true); }, 350);
}


function isMeaningfulProject(s) {
  return !!(s && s.persons && Object.keys(s.persons).length);
}

async function openProject() {
  if (!window.showDirectoryPicker) {
    alert('У цьому браузері немає доступу до папки проєкту через File System Access API.');
    return;
  }
  try {
    const dir = await window.showDirectoryPicker({ mode: 'readwrite' });
    if (!dir) return;
    let projectHandle = null;
    for await (const [name, handle] of dir.entries()) {
      if (handle.kind === 'file' && /\.project\.json$/i.test(name)) { projectHandle = handle; break; }
    }
    if (!projectHandle) throw new Error('У цій папці не знайдено файлу проєкту. Натисни «Створити проєкт у папці» або вибери іншу папку.');
    await createProjectBackup(dir);
    projectDirHandle = dir;
    photosDirHandle = await dir.getDirectoryHandle('photos', { create: true });
    await connectJSONFromHandle(projectHandle);
    const file = await projectHandle.getFile();
    const t = await file.text();
    if (t && t.trim()) {
      const parsed = normalizeState(JSON.parse(t));
      const shouldRestore = (!isMeaningfulProject(state) || await confirmReplaceBrowserTree('відкрити JSON-проєкт'))
        && confirm('У файлі знайдено дані проєкту. Завантажити їх у браузер?');
      if (shouldRestore) {
        commitState(parsed, { markDirty: false, linkedJsonName: projectHandle.name || '', statusText: 'Проєкт відкрито' });
      } else {
        updateSaveBadge('ok', 'Проєкт підключено');
        updateInfo();
      }
    }
    hydrateVisiblePhotos();
  } catch (err) {
    if (err && err.name === 'AbortError') return;
    alert('Не вдалося відкрити проєкт: ' + (err.message || err));
  }
}

async function createProjectBackup(dir) {
  if (!isMeaningfulProject(state)) return;
  const stamp = new Date().toISOString().replace(/[.:]/g, '-');
  const base = suggestedJsonFilename().replace(/\.project\.json$/i, '') || 'tree';
  const backupJsonHandle = await dir.getFileHandle(`${base}.backup.${stamp}.project.json`, { create: true });
  const jsonWritable = await backupJsonHandle.createWritable();
  await jsonWritable.write(buildJsonPayload());
  await jsonWritable.close();
  const backupGedHandle = await dir.getFileHandle(`${base}.backup.${stamp}.ged`, { create: true });
  const gedWritable = await backupGedHandle.createWritable();
  await gedWritable.write(generateGEDCOM(state));
  await gedWritable.close();
}

async function createProject() {
  if (!window.showDirectoryPicker) {
    alert('У цьому браузері немає створення проєкту через папку.');
    return;
  }
  try {
    const dir = await window.showDirectoryPicker({ mode: 'readwrite' });
    if (!dir) return;
    await createProjectBackup(dir);
    projectDirHandle = dir;
    photosDirHandle = await dir.getDirectoryHandle('photos', { create: true });
    const projectHandle = await dir.getFileHandle(suggestedJsonFilename(dir.name), { create: true });
    await connectJSONFromHandle(projectHandle);
    const ok = await saveJsonMirror(false);
    if (ok) {
      updateSaveBadge('ok', 'Створено новий проєкт у папці');
      updateInfo();
    }
  } catch (err) {
    if (err && err.name === 'AbortError') return;
    alert('Не вдалося створити проєкт у папці: ' + (err.message || err));
  }
}

function triggerGedcomImport() { document.getElementById('gedInput').click(); }

function findOwnFamily(pid) {
  return Object.values(state.families).find(f => (f.adults || []).includes(pid)) || null;
}

function getFamilyForPersonContext(pid, fid) {
  if (fid && state.families[fid] && (state.families[fid].adults || []).includes(pid)) return state.families[fid];
  return findOwnFamily(pid);
}
function ensurePartnerStatuses(fam) {
  if (!fam) return {};
  if (!fam.partnerStatuses || typeof fam.partnerStatuses !== 'object') fam.partnerStatuses = {};
  const adults = fam.adults || [];
  const legacy = (fam.partnerStatus === 'divorced' || fam.relationshipStatus === 'divorced') ? 'divorced' : 'married';
  adults.forEach((pid, idx) => {
    // Статус зв'язку зберігаємо для кожного партнера після основної особи.
    // Першу особу не позначаємо окремо, бо її статус читається через першого партнера.
    if (idx > 0 && fam.partnerStatuses[pid] !== 'married' && fam.partnerStatuses[pid] !== 'divorced') {
      fam.partnerStatuses[pid] = legacy;
    }
  });
  // Прибираємо статуси людей, яких уже немає серед дорослих цієї сім'ї.
  Object.keys(fam.partnerStatuses).forEach(pid => {
    if (!adults.includes(pid) || adults[0] === pid) delete fam.partnerStatuses[pid];
  });
  return fam.partnerStatuses;
}
function getAdultPartnerStatus(fam, pid) {
  if (!fam || !(fam.adults || []).includes(pid)) return 'married';
  const adults = fam.adults || [];
  const statuses = ensurePartnerStatuses(fam);
  if (adults[0] === pid && adults.length > 1) {
    const firstPartner = adults.find(id => id !== pid);
    return statuses[firstPartner] === 'divorced' ? 'divorced' : 'married';
  }
  return statuses[pid] === 'divorced' ? 'divorced' : 'married';
}
function setAdultPartnerStatus(fam, pid, status) {
  if (!fam || !(fam.adults || []).includes(pid)) return;
  const adults = fam.adults || [];
  const statuses = ensurePartnerStatuses(fam);
  const value = status === 'divorced' ? 'divorced' : 'married';
  const targetPid = (adults[0] === pid) ? adults.find(id => id !== pid) : pid;
  if (targetPid) statuses[targetPid] = value;
  fam.partnerStatus = Object.values(statuses).some(v => v === 'divorced') ? 'divorced' : 'married';
  fam.relationshipStatus = fam.partnerStatus;
}
function orderedFamilyAdults(fam, focusPid = null) {
  const raw = (fam?.adults || []).filter(pid => state.persons[pid]);
  if (!raw.length) return [];
  ensurePartnerStatuses(fam);
  const base = (focusPid && raw.includes(focusPid)) ? focusPid : raw[0];
  const others = raw.filter(id => id !== base);
  others.sort((a,b) => {
    const sa = getAdultPartnerStatus(fam,a), sb = getAdultPartnerStatus(fam,b);
    if (sa !== sb) return sa === 'married' ? -1 : 1;
    return raw.indexOf(a) - raw.indexOf(b);
  });
  return [base, ...others];
}
function findParentFamily(pid) {
  return Object.values(state.families).find(f => (f.children || []).some(c => c.personId === pid)) || null;
}
function hasParents(pid) { return !!findParentFamily(pid); }

function getParentIds(pid, srcState = state) {
  const fam = Object.values(srcState.families || {}).find(f => (f.children || []).some(c => c.personId === pid));
  const adults = (fam?.adults || []).filter(id => srcState.persons[id]);
  return {
    familyId: fam?.id || '',
    fatherId: adults.find(id => srcState.persons[id]?.gender === 'male') || adults[0] || '',
    motherId: adults.find(id => srcState.persons[id]?.gender === 'female') || adults.find(id => id !== adults[0]) || ''
  };
}

function getDescendantIds(pid, srcState = state, seen = new Set()) {
  const own = Object.values(srcState.families || {}).find(f => (f.adults || []).includes(pid));
  if (!own) return seen;
  (own.children || []).forEach(ch => {
    if (ch.personId && !seen.has(ch.personId)) {
      seen.add(ch.personId);
      getDescendantIds(ch.personId, srcState, seen);
    }
  });
  return seen;
}

function fillParentSelects(pid) {
  const fields = document.getElementById('parentFields');
  const fatherEl = document.getElementById('m_father');
  const motherEl = document.getElementById('m_mother');
  if (!fields || !fatherEl || !motherEl) return;
  fields.style.display = pid ? 'block' : 'none';
  if (!pid) return;
  const parents = getParentIds(pid);
  const blocked = getDescendantIds(pid);
  blocked.add(pid);
  const people = Object.values(state.persons || {})
    .filter(p => p && !blocked.has(p.id))
    .sort((a,b) => composeDisplayName(a).localeCompare(composeDisplayName(b), 'uk'));
  const buildOptions = (preferredGender) => {
    const opts = ['<option value="">— не вказано —</option>'];
    people.forEach(p => {
      const mark = p.gender === preferredGender ? '' : ' · інше';
      opts.push(`<option value="${escapeHtml(p.id)}">${escapeHtml(composeDisplayName(p) || 'Без імені')}${mark}</option>`);
    });
    return opts.join('');
  };
  fatherEl.innerHTML = buildOptions('male');
  motherEl.innerHTML = buildOptions('female');
  fatherEl.value = parents.fatherId || '';
  motherEl.value = parents.motherId || '';
}

function setParentsForPersonOnDraft(draft, pid, fatherId, motherId) {
  fatherId = fatherId && draft.persons[fatherId] && fatherId !== pid ? fatherId : '';
  motherId = motherId && draft.persons[motherId] && motherId !== pid && motherId !== fatherId ? motherId : '';
  const descendantIds = getDescendantIds(pid, draft);
  if (descendantIds.has(fatherId)) fatherId = '';
  if (descendantIds.has(motherId)) motherId = '';

  Object.values(draft.families || {}).forEach(fam => {
    fam.children = (fam.children || []).filter(c => c.personId !== pid);
  });
  if (!fatherId && !motherId) {
    Object.keys(draft.families || {}).forEach(fid => {
      const fam = draft.families[fid];
      if (!(fam.adults || []).length && !(fam.children || []).length) delete draft.families[fid];
    });
    return;
  }

  const adults = [fatherId, motherId].filter(Boolean);
  let fam = Object.values(draft.families || {}).find(f => adults.every(id => (f.adults || []).includes(id)));
  if (!fam) {
    const fId = uid('f');
    fam = { id: fId, adults: adults.slice(), children: [], partnerStatus: 'married' };
    draft.families[fId] = fam;
  } else {
    adults.forEach(id => { if (!(fam.adults || []).includes(id)) fam.adults.push(id); });
  }
  if (!(fam.children || []).some(c => c.personId === pid)) {
    fam.children = fam.children || [];
    fam.children.push({ personId: pid, parentAdultId: fatherId || motherId });
  }
  Object.keys(draft.families || {}).forEach(fid => {
    const f = draft.families[fid];
    if (!(f.adults || []).length && !(f.children || []).length) delete draft.families[fid];
  });
}

function familyHasAdults(fam) {
  return !!(fam && (fam.adults || []).some(pid => state.persons[pid]));
}

function isFamilyOpenInCurrentTree(targetFid, currentFid = state.homeId, seen = new Set()) {
  if (!targetFid || !currentFid || seen.has(currentFid)) return false;
  if (targetFid === currentFid) return true;
  const fam = state.families[currentFid];
  if (!fam) return false;
  seen.add(currentFid);
  return (fam.children || []).some(ch => {
    const childFamily = findOwnFamily(ch.personId);
    return childFamily && isFamilyOpenInCurrentTree(targetFid, childFamily.id, seen);
  });
}

function createPlaceholderPersonOnDraft(draft, name, gender) {
  const id = uid('p');
  draft.persons[id] = buildPersonRecord(id, { firstName: name, gender });
  return id;
}

function ensureParentFamilyOnDraft(draft, pid) {
  const fam = Object.values(draft.families).find(f => (f.children || []).some(c => c.personId === pid));
  const person = draft.persons[pid] || { name: 'Особа' };
  const base = composeDisplayName(person) || 'Особа';
  if (fam && (fam.adults || []).some(adultId => draft.persons[adultId])) return fam.id;
  const fatherId = createPlaceholderPersonOnDraft(draft, 'Батько ' + base, 'male');
  const motherId = createPlaceholderPersonOnDraft(draft, 'Мати ' + base, 'female');
  if (fam) {
    fam.adults = [fatherId, motherId];
    return fam.id;
  }
  const fId = uid('f');
  draft.families[fId] = { id: fId, adults: [fatherId, motherId], children: [{ personId: pid }], partnerStatus: 'married' };
  return fId;
}

function goToLineage(pid) {
  withDraft(draft => {
    draft.homeId = ensureParentFamilyOnDraft(draft, pid);
  }, 'Перехід у рід');
  setTimeout(resetView, 30);
}

function createParentsFor(pid) {
  let editPid = null;
  const draft = deepClone(state);
  const existing = Object.values(draft.families).find(f => (f.children || []).some(c => c.personId === pid));
  if (existing) {
    draft.homeId = existing.id;
    editPid = (existing.adults || [])[0] || null;
  } else {
    const famId = ensureParentFamilyOnDraft(draft, pid);
    draft.homeId = famId;
    editPid = (draft.families[famId].adults || [])[0] || null;
  }
  commitState(draft, { markDirty: true, statusText: 'Створено батьків' });
  setTimeout(() => {
    resetView();
    if (editPid) openModal('Редагувати нового з батьків', editPid, (d) => {
      if (d === 'del') deletePerson(editPid);
      else withDraft(m => { Object.assign(m.persons[editPid], buildPersonRecord(editPid, { ...m.persons[editPid], ...d })); }, 'Оновлено особу');
    });
  }, 40);
}

async function createBlankProjectWithReminder() {
  if (isMeaningfulProject(state)) {
    const shouldContinue = await confirmReplaceBrowserTree('створити нове дерево');
    if (!shouldContinue) return;
  }
  const next = defaultState();
  photosState = defaultPhotosState();
  localStorage.setItem(PHOTOS_STORAGE_KEY, JSON.stringify(photosState));
  for (const url of photoUrlCache.values()) {
    try { URL.revokeObjectURL(url); } catch (err) {}
  }
  photoUrlCache.clear();
  commitState(next, { markDirty: false, linkedJsonName: '', statusText: 'Створено порожній локальний проєкт' });
  setTimeout(resetView, 50);
}

async function restoreBackupChooser() {
  const snapshots = getSnapshots();
  if (!snapshots.length) {
    alert('Резервних копій ще немає.');
    return;
  }
  const lines = snapshots.slice(0, 7).map((snap, idx) => {
    const when = formatBackupStamp(snap.ts || '');
    return `${idx + 1}. ${when}`;
  });
  const answer = prompt(
    'Введи номер резервної копії для відновлення:\n\n' +
    lines.join('\n') +
    '\n\n1 — найновіша копія'
  );
  if (answer == null) return;
  const index = Number(String(answer).trim()) - 1;
  if (!Number.isInteger(index) || index < 0 || index >= Math.min(snapshots.length, 7)) {
    alert('Невірний номер копії.');
    return;
  }
  try {
    const recovered = normalizeState(JSON.parse(snapshots[index].payload));
    const shouldContinue = await confirmReplaceBrowserTree('відновити резервну копію');
    if (!shouldContinue) return;
    commitState(recovered, { markDirty: true, statusText: 'Відновлено з резервної копії' });
    resetView();
  } catch (err) {
    alert('Не вдалося відновити копію: ' + err.message);
  }
}

function formatBackupStamp(ts) {
  const d = ts ? new Date(ts) : new Date();
  if (Number.isNaN(d.getTime())) return safeText(ts || 'без дати');
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function createFirstPerson() {
  const next = defaultState();
  const pId = uid('p'), fId = uid('f');
  next.persons[pId] = buildPersonRecord(pId, { firstName: 'Засновник роду', gender: 'male' });
  next.families[fId] = { id: fId, adults: [pId], children: [], partnerStatus: 'married' };
  next.homeId = fId;
  commitState(next, { markDirty: true, statusText: 'Створено нове дерево' });
  setTimeout(resetView, 50);
}

function render() {
  treeEl.textContent = '';
  familyWidthCache = new Map();
  if (!state.homeId || !state.families[state.homeId]) {
    treeEl.innerHTML = '<div style="padding:100px; text-align:center"><button class="btn" onclick="createFirstPerson()">Створити дерево</button></div>';
    updateTransform();
    requestDrawConnectors();
    updateInfo();
    return;
  }

  const canvas = document.createElement('div');
  canvas.id = 'treeCanvas';
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('id', 'lines');
  canvas.appendChild(svg);
  const forest = document.createElement('div');
  forest.className = 'forest';
  forest.appendChild(renderFamily(state.homeId, null));
  canvas.appendChild(forest);
  treeEl.appendChild(canvas);

  updateTransform();
  requestDrawConnectors(() => updateInfo());
}

function collectVisibleFamilyIds(fId, seen = new Set()) {
  if (!fId || !state.families[fId] || seen.has(fId)) return seen;
  seen.add(fId);
  (state.families[fId].children || []).forEach(ch => {
    const subFam = findOwnFamily(ch.personId);
    if (subFam) collectVisibleFamilyIds(subFam.id, seen);
  });
  return seen;
}

function getRootFamilyIds() {
  const childIds = new Set();
  Object.values(state.families || {}).forEach(fam => {
    (fam.children || []).forEach(ch => { if (ch.personId) childIds.add(ch.personId); });
  });
  return Object.values(state.families || {})
    .filter(fam => (fam.adults || []).some(pid => !childIds.has(pid)))
    .map(fam => fam.id);
}

function collectVisiblePersonIds(familyIds) {
  const persons = new Set();
  (familyIds || new Set()).forEach(fid => {
    const fam = state.families[fid];
    if (!fam) return;
    (fam.adults || []).forEach(pid => persons.add(pid));
    (fam.children || []).forEach(ch => { if (ch.personId) persons.add(ch.personId); });
  });
  return persons;
}

function getStandalonePersonIds(visiblePersons) {
  return Object.keys(state.persons || {}).filter(pid => !visiblePersons.has(pid));
}

function updateInfo() {
  let famCount = Object.keys(state.families || {}).length;
  let pCount = Object.keys(state.persons || {}).length;

  // Захист від рідкісної ситуації, коли дерево вже намальоване з відновлених даних,
  // а лічильник показує 0 через застарілий/неповний локальний стан браузера.
  const renderedPeople = document.querySelectorAll('#tree .person[data-pid]').length;
  const renderedFamilies = document.querySelectorAll('#tree .family[data-fid]').length;
  if (!pCount && renderedPeople) pCount = renderedPeople;
  if (!famCount && renderedFamilies) famCount = renderedFamilies;

  const snapshots = getSnapshots().length;
  const dirty = state.meta?.dirty ? '● є зміни' : "✓ синхронно в пам'яті";
  const backupAt = state.meta?.lastAutoBackupAt ? ` • backup: ${new Date(state.meta.lastAutoBackupAt).toLocaleString('uk-UA')}` : '';
  document.getElementById('info').textContent = `Осіб: ${pCount} • Родин: ${famCount} • Копій: ${snapshots} • ${dirty} • локально у браузері${backupAt}`;
  updateProjectStatusUI();
}


function getChildAnchorSortIndex(fam, child, childIndex) {
  const adults = orderedFamilyAdults(fam);
  if (!adults.length) return 0;
  const adultId = getLegacyChildAnchorAdultId(fam, child, childIndex);
  if (!adultId) return (adults.length - 1) / 2;
  const idx = adults.indexOf(adultId);
  return idx >= 0 ? idx : (adults.length - 1) / 2;
}

function orderedFamilyChildren(fam) {
  return (fam.children || []).map((child, index) => ({ child, index }))
    .sort((a,b) => {
      const sa = getChildAnchorSortIndex(fam, a.child, a.index);
      const sb = getChildAnchorSortIndex(fam, b.child, b.index);
      if (sa !== sb) return sa - sb;
      return a.index - b.index;
    });
}

function renderFamily(fId, focusPid = null, seen = new Set()) {
  const fam = state.families[fId];
  if (!fam) return document.createElement('div');
  if (seen.has(fId)) return focusPid ? renderLeaf(focusPid) : document.createElement('div');
  seen.add(fId);
  const family = document.createElement('div');
  family.className = 'family';
  family.dataset.fid = fId;

  const couple = document.createElement('div');
  couple.className = 'couple';
  couple.dataset.partnerStatus = fam.partnerStatus || 'married';
  family.appendChild(couple);

  const adults = orderedFamilyAdults(fam, focusPid);

  if (adults.length) {
    couple.appendChild(createPersonElement(adults[0], fId, true));
    for (let i = 1; i < adults.length; i++) couple.appendChild(createPersonElement(adults[i], fId, false));
  }

  if (fam.children && fam.children.length > 0) {
    const row = document.createElement('div');
    row.className = 'children-row';
    family.appendChild(row);

    orderedFamilyChildren(fam).forEach(({ child: ch, index: childIndex }) => {
      const slot = document.createElement('div');
      slot.className = 'child-slot';
      slot.dataset.childIndex = String(childIndex);
      slot.dataset.childPersonId = ch.personId || '';
      slot.dataset.childAnchorAdultId = getLegacyChildAnchorAdultId(fam, ch, childIndex) || '';
      const subFam = findOwnFamily(ch.personId);
      const node = subFam && !seen.has(subFam.id) ? renderFamily(subFam.id, ch.personId, new Set(seen)) : renderLeaf(ch.personId);
      slot.style.width = getChildSlotWidth(ch.personId) + 'px';
      slot.appendChild(node);
      row.appendChild(slot);
    });
  }
  return family;
}

function getFamilyWidth(fId, seen = new Set()) {
  if (!fId || !state.families[fId]) return PERSON_CARD_WIDTH;
  if (!seen.size && familyWidthCache.has(fId)) return familyWidthCache.get(fId);
  if (seen.has(fId)) return PERSON_CARD_WIDTH;
  seen.add(fId);

  const fam = state.families[fId];
  const adults = orderedFamilyAdults(fam);
  const adultsCount = Math.max(1, adults.length || 1);
  const extraPartnerGap = adults.slice(1).reduce((sum, pid) => sum + (getAdultPartnerStatus(fam, pid) === 'divorced' ? 38 : 0), 0);
  const coupleWidth = adultsCount * PERSON_CARD_WIDTH + Math.max(0, adultsCount - 1) * COUPLE_GAP + extraPartnerGap;

  const children = fam.children || [];
  if (!children.length) {
    seen.delete(fId);
    if (!seen.size) familyWidthCache.set(fId, coupleWidth);
    return coupleWidth;
  }

  const childrenWidth = children.reduce((sum, ch, idx) => {
    return sum + getChildSlotWidth(ch.personId, seen) + (idx ? CHILDREN_GAP : 0);
  }, 0);

  seen.delete(fId);
  const width = Math.max(coupleWidth, childrenWidth);
  if (!seen.size) familyWidthCache.set(fId, width);
  return width;
}

function getChildSlotWidth(pid, seen = new Set()) {
  const ownFam = findOwnFamily(pid);
  if (!ownFam) return PERSON_CARD_WIDTH;
  return getFamilyWidth(ownFam.id, seen);
}

function renderLeaf(pid) {
  const leaf = document.createElement('div');
  leaf.className = 'family leaf';
  leaf.dataset.leafPid = pid;
  const couple = document.createElement('div');
  couple.className = 'couple';
  couple.dataset.partnerStatus = 'married';
  leaf.appendChild(couple);
  couple.appendChild(createPersonElement(pid, null, true));
  return leaf;
}

function getPhotoStyle(pid) {
  const p = state.persons[pid];
  if (!p || !p.photoId) return '';
  const url = photoUrlCache.get(p.photoId);
  return url ? `url('${url}')` : '';
}

async function refreshPhotoCacheForPerson(pid) {
  const p = state.persons[pid];
  if (!p || !p.photoId) return false;
  if (photoUrlCache.has(p.photoId)) return true;
  const blob = await getPhotoBlobById(p.photoId);
  if (!blob) return false;
  const old = photoUrlCache.get(p.photoId);
  if (old) {
    try { URL.revokeObjectURL(old); } catch (err) {}
  }
  photoUrlCache.set(p.photoId, URL.createObjectURL(blob));
  return true;
}

async function hydrateVisiblePhotos() {
  const pids = Array.from(new Set(Array.from(document.querySelectorAll('.person-wrap[data-pid]')).map(el => el.dataset.pid)));
  const loaded = await Promise.all(pids.map(pid => refreshPhotoCacheForPerson(pid)));
  if (loaded.some(Boolean)) render();
}

function createPersonElement(pid, fId, isMain) {
  const p = state.persons[pid];
  const wrap = document.createElement('div');
  wrap.className = 'person-wrap';
  wrap.dataset.pid = pid;
  wrap.dataset.main = isMain ? '1' : '0';
  if (!p) return wrap;
  const parentFamily = findParentFamily(pid);
  const showLineage = !parentFamily || !familyHasAdults(parentFamily) || !isFamilyOpenInCurrentTree(parentFamily.id);
  const photoStyle = getPhotoStyle(pid);
  const avatarHtml = photoStyle ? `<div class="avatar" style="background-image:${photoStyle}"></div>` : `<div class="avatar">👤</div>`;

  const fam = fId ? state.families[fId] : null;
  const partnerStatus = fam ? getAdultPartnerStatus(fam, pid) : 'married';
  if (!isMain && fam) wrap.classList.add(partnerStatus === 'divorced' ? 'partner-divorced' : 'partner-married');
  const relationNote = (!isMain && fam && partnerStatus === 'divorced') ? '<div class="relation-note">розлучені</div>' : '<div class="relation-note"></div>';

  const card = document.createElement('div');
  card.className = `person ${p.gender}`;
  card.dataset.id = pid;
  card.dataset.fid = fId || '';
  card.innerHTML = `
    ${showLineage ? '<button class="corner-btn corner-left" data-act="goto_lineage" title="Перейти у рід">🌳</button>' : ''}
${avatarHtml}
    <div class="name">${formatCardNameHtml(p)}</div>
    <div class="years">${escapeHtml(formatLifeInfo(p))}</div>
    ${relationNote}
    <button class="bottom-btn bottom-left" data-act="edit" title="Редагувати">✏️</button>
    <button class="bottom-btn bottom-center" data-act="add_ch" title="Додати дитину">👶</button>
    <button class="bottom-btn bottom-right" data-act="add_p" title="Додати партнера">❤️</button>
  `;
  wrap.appendChild(card);
  return wrap;
}

function formatCardNameHtml(person) {
  const first = safeNamePart(person?.firstName || person?.name || '') || 'Без імені';
  const last = safeNamePart(person?.lastName || '');
  const maiden = safeNamePart(person?.maidenName || '');
  const lines = [`<span class="name-line">${escapeHtml(first)}</span>`];
  if (last) lines.push(`<span class="name-line">${escapeHtml(last)}</span>`);
  if (maiden) lines.push(`<span class="maiden-line">(${escapeHtml(maiden)})</span>`);
  return lines.join('');
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
}

function requestDrawConnectors(afterDraw) {
  if (connectorFrame) cancelAnimationFrame(connectorFrame);
  connectorFrame = requestAnimationFrame(() => {
    connectorFrame = requestAnimationFrame(() => {
      connectorFrame = 0;
      drawConnectors();
      if (typeof afterDraw === 'function') afterDraw();
    });
  });
}


function getExplicitChildAnchorAdultId(child) {
  if (!child || typeof child !== 'object') return '';
  return child.parentAdultId || child.anchorAdultId || child.sourceAdultId || child.partnerId || '';
}

function getLegacyChildAnchorAdultId(fam, child, childIndex) {
  const explicit = getExplicitChildAnchorAdultId(child);
  if (explicit && (fam.adults || []).includes(explicit)) return explicit;

  const adults = fam.adults || [];
  if (!adults.length) return '';

  const partners = adults.slice(1);
  const married = partners.filter(pid => getAdultPartnerStatus(fam, pid) === 'married');
  const divorced = partners.filter(pid => getAdultPartnerStatus(fam, pid) === 'divorced');

  // Якщо у родині тільки двоє дорослих і зв'язок позначено як розлучений,
  // без збереженого parentAdultId ми не вигадуємо другого батька — ведемо
  // гілку від основної особи. Нові діти вже отримують parentAdultId при додаванні.
  if (adults.length <= 2) {
    const onlyPartner = adults[1] || '';
    const isDivorcedPair = (fam.partnerStatus === 'divorced') || (onlyPartner && getAdultPartnerStatus(fam, onlyPartner) === 'divorced');
    return isDivorcedPair ? adults[0] : '';
  }

  // Для старих проєктів із кількома партнерами без збереженого батька/партнера:
  // перша дитина лишається за активним шлюбом, наступні — за розлученим партнером.
  // Нові діти отримують parentAdultId під час додавання, тому малюються точно.
  if (married.length && divorced.length) return childIndex === 0 ? married[0] : divorced[0];
  if (married.length) return married[0];
  if (divorced.length) return divorced[0];
  return '';
}

function getCoupleCards(couple) {
  return Array.from(couple.querySelectorAll(':scope > .person-wrap > .person'));
}

function getMarriedCoupleCenter(couple, fam, partnerId, toLocalX, toLocalY) {
  const cards = getCoupleCards(couple);
  if (!cards.length) return null;

  let selected = cards;
  if (partnerId) {
    const partnerCard = couple.querySelector(`:scope > .person-wrap[data-pid="${CSS.escape(partnerId)}"] > .person`);
    const mainCard = couple.querySelector(':scope > .person-wrap[data-main="1"] > .person');
    if (partnerCard && mainCard && partnerCard !== mainCard) selected = [mainCard, partnerCard];
  } else if (fam) {
    selected = cards.filter(card => {
      const pid = card.closest('.person-wrap')?.dataset.pid || '';
      return !pid || getAdultPartnerStatus(fam, pid) !== 'divorced';
    });
    if (!selected.length) selected = [cards[0]];
  }

  const rects = selected.map(card => card.getBoundingClientRect());
  const left = Math.min(...rects.map(r => r.left));
  const right = Math.max(...rects.map(r => r.right));
  const bottom = Math.max(...rects.map(r => r.bottom));
  return { x: toLocalX((left + right) / 2), y: toLocalY(bottom) };
}

function getChildConnectorAnchor(family, couple, child, childIndex, toLocalX, toLocalY) {
  const fam = state.families[family.dataset.fid];
  const fallback = getMarriedCoupleCenter(couple, fam, '', toLocalX, toLocalY);
  if (!fam) return fallback || { x: 0, y: 0 };

  const adultId = getLegacyChildAnchorAdultId(fam, child, childIndex);
  if (!adultId) return fallback || { x: 0, y: 0 };

  const adultWrap = couple.querySelector(`:scope > .person-wrap[data-pid="${CSS.escape(adultId)}"]`);
  const adultCard = adultWrap ? adultWrap.querySelector('.person') : null;
  if (!adultCard) return fallback || { x: 0, y: 0 };

  const status = getAdultPartnerStatus(fam, adultId);
  const pairIsDivorced = status === 'divorced' || fam.partnerStatus === 'divorced';

  // Активний шлюб: гілка до дітей іде від центру пари.
  // Розлучення: гілка до дітей іде від конкретного партнера/батька.
  if (!pairIsDivorced) {
    const pairCenter = getMarriedCoupleCenter(couple, fam, adultId, toLocalX, toLocalY);
    if (pairCenter) return pairCenter;
  }

  const r = adultCard.getBoundingClientRect();
  return { x: toLocalX(r.left + r.width / 2), y: toLocalY(r.bottom) };
}

function drawConnectors() {
  const canvas = document.getElementById('treeCanvas');
  const svg = document.getElementById('lines');
  if (!canvas || !svg) return;

  const cRect = canvas.getBoundingClientRect();
  const currentScale = scale || 1;
  const width = Math.ceil(canvas.scrollWidth || 1);
  const height = Math.ceil(canvas.scrollHeight || 1);
  svg.setAttribute('width', width);
  svg.setAttribute('height', height);
  svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
  svg.textContent = '';

  const lineColor = getComputedStyle(document.documentElement).getPropertyValue('--line').trim() || '#cbd5e1';
  const toLocalX = x => (x - cRect.left) / currentScale;
  const toLocalY = y => (y - cRect.top) / currentScale;

  canvas.querySelectorAll('.family > .couple').forEach(couple => {
    const wraps = Array.from(couple.children);
    for (let i = 1; i < wraps.length; i++) {
      const a = wraps[i - 1].querySelector('.person');
      const b = wraps[i].querySelector('.person');
      if (!a || !b) continue;
      const ra = a.getBoundingClientRect();
      const rb = b.getBoundingClientRect();
      const dashed = a.closest('.person-wrap')?.classList.contains('partner-divorced') || b.closest('.person-wrap')?.classList.contains('partner-divorced') || couple.dataset.partnerStatus === 'divorced';
      addLine(svg, toLocalX(ra.right), toLocalY(ra.top + ra.height / 2), toLocalX(rb.left), toLocalY(rb.top + rb.height / 2), lineColor, dashed);
    }
  });

  canvas.querySelectorAll('.family[data-fid]').forEach(family => {
    const fam = state.families[family.dataset.fid];
    const couple = family.querySelector(':scope > .couple');
    const row = family.querySelector(':scope > .children-row');
    if (!fam || !couple || !row || !row.children.length) return;
    if (!couple.querySelector(':scope > .person-wrap > .person')) return;

    const groups = new Map();
    Array.from(row.children).forEach((childSlot, idx) => {
      const sourceIndex = Number(childSlot.dataset.childIndex || idx);
      const childData = (fam.children || [])[sourceIndex] || null;
      const childMain = childSlot.querySelector(':scope > .family > .couple > .person-wrap[data-main="1"] > .person')
        || childSlot.querySelector(':scope > .family > .couple .person')
        || childSlot.querySelector(':scope > .family.leaf > .couple .person')
        || childSlot.querySelector('.person');
      if (!childMain) return;
      const r = childMain.getBoundingClientRect();
      const anchor = getChildConnectorAnchor(family, couple, childData, sourceIndex, toLocalX, toLocalY);
      const key = `${Math.round(anchor.x)}:${Math.round(anchor.y)}`;
      if (!groups.has(key)) groups.set(key, { anchor, children: [] });
      groups.get(key).children.push({ x: toLocalX(r.left + r.width / 2), top: toLocalY(r.top) });
    });

    groups.forEach(group => {
      const anchors = group.children;
      if (!anchors.length) return;
      const descX = group.anchor.x;
      const descY = group.anchor.y;
      const busY = descY + 36;
      addLine(svg, descX, descY, descX, busY, lineColor);
      if (anchors.length === 1) {
        addLine(svg, descX, busY, anchors[0].x, busY, lineColor);
        addLine(svg, anchors[0].x, busY, anchors[0].x, anchors[0].top - 10, lineColor);
      } else {
        // Горизонтальна "шина" має доходити не лише до крайніх дітей,
        // а й до точки спуску від конкретного батька/партнера.
        // Інакше, коли батько стоїть правіше/лівіше групи дітей,
        // вертикальна лінія від нього не торкається дитячої шини.
        const xs = anchors.map(a => a.x).concat(descX);
        const minX = Math.min(...xs);
        const maxX = Math.max(...xs);
        addLine(svg, minX, busY, maxX, busY, lineColor);
        anchors.forEach(a => addLine(svg, a.x, busY, a.x, a.top - 10, lineColor));
      }
    });
  });
}

function addLine(svg, x1, y1, x2, y2, color, dashed = false) {
  const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
  line.setAttribute('x1', Math.round(x1));
  line.setAttribute('y1', Math.round(y1));
  line.setAttribute('x2', Math.round(x2));
  line.setAttribute('y2', Math.round(y2));
  line.setAttribute('stroke', color);
  line.setAttribute('stroke-width', '2');
  line.setAttribute('stroke-linecap', 'round');
  if (dashed) line.setAttribute('stroke-dasharray', '8 6');
  svg.appendChild(line);
}

function updateTransform() { treeEl.style.transform = `translate3d(${posX}px, ${posY}px, 0) scale(${scale})`; }

function fitTreeInView() {
  resizeViewport();
  const r = view.getBoundingClientRect();
  const canvas = document.getElementById('treeCanvas');
  if (!canvas || !r.width || !r.height) {
    scale = 0.8;
    posX = Math.max(20, r.width / 2 - 160);
    posY = 40;
    updateTransform();
    return;
  }
  const treeWidth = Math.max(canvas.scrollWidth || 0, canvas.offsetWidth || 0, PERSON_CARD_WIDTH);
  const treeHeight = Math.max(canvas.scrollHeight || 0, canvas.offsetHeight || 0, PERSON_CARD_WIDTH);
  const fitWidth = (r.width - 28) / treeWidth;
  const fitHeight = (r.height - 28) / treeHeight;
  scale = Math.max(0.28, Math.min(0.8, fitWidth, fitHeight || fitWidth));
  const scaledWidth = treeWidth * scale;
  posX = Math.max(12, (r.width - scaledWidth) / 2);
  posY = 18;
  updateTransform();
  requestDrawConnectors();
}

view.addEventListener('wheel', e => { e.preventDefault(); applyZoom(e.deltaY > 0 ? 0.9 : 1.1, e.clientX, e.clientY); }, { passive: false });
view.onmousedown = e => { if (e.target.closest('button')) return; isDragging = true; lastX = e.clientX; lastY = e.clientY; view.style.cursor = 'grabbing'; };
window.addEventListener('mousemove', e => { if (!isDragging) return; posX += e.clientX - lastX; posY += e.clientY - lastY; lastX = e.clientX; lastY = e.clientY; updateTransform(); });
window.onmouseup = () => { isDragging = false; view.style.cursor = 'grab'; };
view.addEventListener('touchstart', e => {
  if (e.target.closest('button')) return;
  if (e.touches.length === 1) { isDragging = true; lastX = e.touches[0].clientX; lastY = e.touches[0].clientY; }
  else if (e.touches.length === 2) {
    lastTouchDist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
  }
}, { passive: false });
window.addEventListener('touchmove', e => {
  if (e.touches.length === 2) {
    e.preventDefault();
    const dist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
    const midX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
    const midY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
    applyZoom(dist / lastTouchDist, midX, midY);
    lastTouchDist = dist;
  } else if (isDragging && e.touches.length === 1) {
    posX += e.touches[0].clientX - lastX; posY += e.touches[0].clientY - lastY; lastX = e.touches[0].clientX; lastY = e.touches[0].clientY; updateTransform();
  }
}, { passive: false });
window.addEventListener('touchend', () => isDragging = false);

function applyZoom(delta, clientX, clientY) {
  const newScale = Math.max(0.1, Math.min(3, scale * delta));
  const rect = view.getBoundingClientRect();
  const mx = clientX - rect.left, my = clientY - rect.top;
  posX = mx - (mx - posX) * (newScale / scale);
  posY = my - (my - posY) * (newScale / scale);
  scale = newScale;
  updateTransform();
  requestDrawConnectors();
}

// --- Дії з картками ---
treeEl.onclick = e => {
  const btn = e.target.closest('button');
  if (!btn) return;
  const act = btn.dataset.act;
  const pDiv = btn.closest('.person');
  const pid = pDiv.dataset.id;
  const fid = pDiv.dataset.fid;

  if (act === 'edit') {
    openModal('Редагувати', pid, (d) => {
      if (d === 'del') deletePerson(pid);
      else withDraft(draft => {
        const ps = d.partnerStatus;
        const fatherId = d.fatherId;
        const motherId = d.motherId;
        delete d.partnerStatus;
        delete d.fatherId;
        delete d.motherId;
        Object.assign(draft.persons[pid], d);
        setParentsForPersonOnDraft(draft, pid, fatherId, motherId);
        const fam = (fid && draft.families[fid] && (draft.families[fid].adults || []).includes(pid))
          ? draft.families[fid]
          : Object.values(draft.families).find(f => (f.adults || []).includes(pid));
        if (fam) setAdultPartnerStatus(fam, pid, ps || getAdultPartnerStatus(fam, pid));
      }, 'Оновлено особу');
    }, fid);
  } else if (act === 'add_ch') {
    openModal('Додати дитину', null, d => {
      withDraft(draft => {
        const tFid = fid || createFamilyOnDraft(draft, pid);
        const nid = uid('p');
        draft.persons[nid] = buildPersonRecord(nid, d);
        draft.families[tFid].children.push({ personId: nid, parentAdultId: pid });
      }, 'Додано дитину');
    });
  } else if (act === 'add_p') {
    openModal('Додати партнера', null, d => {
      withDraft(draft => {
        const tFid = fid || createFamilyOnDraft(draft, pid);
        const nid = uid('p');
        const ps = d.partnerStatus || 'married';
        delete d.partnerStatus;
        draft.persons[nid] = buildPersonRecord(nid, d);
        draft.families[tFid].adults.push(nid);
        setAdultPartnerStatus(draft.families[tFid], nid, ps);
      }, 'Додано партнера');
    });
  } else if (act === 'goto_lineage') {
    goToLineage(pid);
  }
};

function createFamilyOnDraft(draft, pid) {
  const existing = Object.values(draft.families).find(f => (f.adults || []).includes(pid));
  if (existing) return existing.id;
  const fId = uid('f');
  draft.families[fId] = { id: fId, adults: [pid], children: [], partnerStatus: 'married' };
  return fId;
}

function deletePerson(pid) {
  if (!confirm('Видалити?')) return;
  withDraft(draft => {
    delete draft.persons[pid];
    for (const f in draft.families) {
      draft.families[f].adults = (draft.families[f].adults || []).filter(id => id !== pid);
      draft.families[f].children = (draft.families[f].children || []).filter(c => c.personId !== pid);
      if (draft.families[f].adults.length === 0 && draft.families[f].children.length === 0) delete draft.families[f];
    }
    if (!draft.families[draft.homeId]) draft.homeId = Object.keys(draft.families)[0] || '';
  }, 'Видалено особу');
}

async function compressImageToWebP(file, maxSide = 256, quality = 0.76) {
  const bmp = await createImageBitmap(file);
  let { width, height } = bmp;
  const s = Math.min(1, maxSide / Math.max(width, height));
  width = Math.max(1, Math.round(width * s));
  height = Math.max(1, Math.round(height * s));
  const canvas = document.createElement('canvas');
  canvas.width = width; canvas.height = height;
  canvas.getContext('2d').drawImage(bmp, 0, 0, width, height);
  return await new Promise(resolve => canvas.toBlob(resolve, 'image/webp', quality));
}

async function savePendingPhotoForPerson(pid) {
  if (!pid) return;
  if (!pendingPhotoBlob && !modalPhotoChanged) return;
  const photoId = pendingPhotoId || state.persons[pid]?.photoId || uid('photo');
  if (pendingPhotoBlob) {
    if (photosDirHandle) {
      try {
        const fh = await photosDirHandle.getFileHandle(`${photoId}.webp`, { create: true });
        const writable = await fh.createWritable();
        await writable.write(pendingPhotoBlob);
        await writable.close();
      } catch (err) {
        console.warn('Не вдалося записати фото в папку проєкту', err);
      }
    }
    state.persons[pid].photoId = photoId;
    await cachePhotoBlob(photoId, pendingPhotoBlob, pendingPhotoBlob.type || 'image/webp');
  } else if (modalPhotoChanged) {
    clearCachedPhoto(photoId);
    state.persons[pid].photoId = '';
  }
  pendingPhotoBlob = null;
  pendingPhotoId = '';
  modalPhotoSaved = true;
}


function openModal(t, pid, cb, fid = null) {

  curCb = cb;
  currentModalPersonId = pid || null;
  currentModalFamilyId = fid || null;
  document.getElementById('modalTitle').textContent = t;
  const p = pid ? state.persons[pid] : buildPersonRecord('', { firstName: '', gender: 'male' });
  const firstNameEl = document.getElementById('m_firstName');
  const lastNameEl = document.getElementById('m_lastName');
  const maidenNameEl = document.getElementById('m_maidenName');
  firstNameEl.value = p.firstName || p.name || '';
  lastNameEl.value = p.lastName || '';
  maidenNameEl.value = p.maidenName || '';
  document.getElementById('m_gender').value = p.gender || 'male';
  const statusEl = document.getElementById('m_partnerStatus');
  const ownFamForStatus = pid ? getFamilyForPersonContext(pid, fid) : null;
  const isAddingPartner = /Додати партнера/.test(t);
  const showPartnerStatus = isAddingPartner || !!(pid && ownFamForStatus && (ownFamForStatus.adults || []).length > 1);
  if (statusEl) {
    statusEl.value = ownFamForStatus ? getAdultPartnerStatus(ownFamForStatus, pid) : 'married';
    statusEl.style.display = showPartnerStatus ? 'block' : 'none';
    const statusLabel = document.querySelector('label[for="m_partnerStatus"]');
    if (statusLabel) statusLabel.style.display = showPartnerStatus ? 'block' : 'none';
  }
  document.getElementById('m_birth').value = p.birth || '';
  document.getElementById('m_death').value = p.death || '';
  const deathStatusEl = document.getElementById('m_deathStatus');
  if (deathStatusEl) deathStatusEl.value = p.deathStatus || '';
  document.getElementById('m_note').value = p.note || '';
  pendingPhotoBlob = null;
  pendingPhotoId = '';
  modalOriginalPhotoId = pid ? (p.photoId || '') : '';
  modalPhotoChanged = false;
  modalPhotoSaved = false;
  const preview = document.getElementById('photoPreview');
  const style = pid ? getPhotoStyle(pid) : '';
  preview.style.backgroundImage = style || '';
  preview.textContent = style ? '' : '👤';
  document.getElementById('photoPickBtn').style.display = pid ? 'inline-block' : 'none';
  document.getElementById('photoClearBtn').style.display = pid ? 'inline-block' : 'none';
  const autoClear = !pid || /Додати|нового/.test(t) || /^(Батько|Мати)\s/.test(firstNameEl.value);
  [firstNameEl, lastNameEl, maidenNameEl].forEach(el => {
    el.dataset.autoClear = autoClear ? '1' : '0';
    el.dataset.didClear = '0';
  });
  const parentFam = pid ? findParentFamily(pid) : null;
  const ownFam = pid ? findOwnFamily(pid) : null;
  const context = [];
  if (pid) {
    context.push(parentFam ? 'має батьків' : 'без батьків');
    context.push(`партнерів: ${(ownFam?.adults || []).filter(id => id !== pid).length}`);
    context.push(`дітей: ${(ownFam?.children || []).length || 0}`);
  }
  document.getElementById('modalContext').textContent = context.join(' • ');
  document.getElementById('modalContext').style.display = pid ? 'block' : 'none';
  document.getElementById('modalDeleteInlineBtn').style.display = pid ? 'block' : 'none';
  fillParentSelects(pid);
  document.getElementById('modalActions').style.display = pid ? 'block' : 'none';
  document.getElementById('advancedFields').open = !!pid;
  document.getElementById('mainModal').style.display = 'flex';
  setTimeout(() => {
    firstNameEl.focus();
    if (autoClear && firstNameEl.value) firstNameEl.select();
  }, 30);
}
function closeModal() {
  if (currentModalPersonId && modalPhotoChanged && !modalPhotoSaved) {
    state.persons[currentModalPersonId].photoId = modalOriginalPhotoId || '';
    if (!modalOriginalPhotoId && pendingPhotoId && photoUrlCache.has(pendingPhotoId)) {
      try { URL.revokeObjectURL(photoUrlCache.get(pendingPhotoId)); } catch (err) {}
      photoUrlCache.delete(pendingPhotoId);
    }
    render();
  }
  currentModalPersonId = null;
  currentModalFamilyId = null;
  pendingPhotoBlob = null;
  pendingPhotoId = '';
  modalOriginalPhotoId = '';
  modalPhotoChanged = false;
  modalPhotoSaved = false;
  document.getElementById('mainModal').style.display = 'none';
}
document.getElementById('modalSaveBtn').onclick = async () => {
  const firstName = safeNamePart(document.getElementById('m_firstName').value) || 'Без імені';
  const lastName = safeNamePart(document.getElementById('m_lastName').value);
  const maidenName = safeNamePart(document.getElementById('m_maidenName').value);
  curCb({ 
    firstName,
    lastName,
    maidenName,
    gender: document.getElementById('m_gender').value,
    partnerStatus: (document.getElementById('m_partnerStatus')?.style.display === 'none') ? undefined : (document.getElementById('m_partnerStatus')?.value || 'married'),
    birth: document.getElementById('m_birth').value || '',
    death: document.getElementById('m_death').value || '',
    deathStatus: document.getElementById('m_deathStatus')?.value || '',
    note: document.getElementById('m_note').value || '',
    fatherId: currentModalPersonId ? (document.getElementById('m_father')?.value || '') : undefined,
    motherId: currentModalPersonId ? (document.getElementById('m_mother')?.value || '') : undefined
  });
  if (currentModalPersonId) {
    try {
      await savePendingPhotoForPerson(currentModalPersonId);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      scheduleMirrorSave();
    } catch (err) {
      alert('Не вдалося зберегти фото: ' + err.message);
    }
  }
  closeModal();
};
document.getElementById('modalDeleteInlineBtn').onclick = () => { curCb('del'); closeModal(); };
document.getElementById('photoPickBtn').onclick = () => { document.getElementById('photoInput').click(); };
document.getElementById('photoClearBtn').onclick = () => {
  if (!currentModalPersonId) return;
  pendingPhotoBlob = null;
  pendingPhotoId = modalOriginalPhotoId || state.persons[currentModalPersonId].photoId || '';
  state.persons[currentModalPersonId].photoId = '';
  modalPhotoChanged = true;
  const preview = document.getElementById('photoPreview');
  preview.style.backgroundImage='';
  preview.textContent='👤';
  render();
};
document.getElementById('photoInput').onchange = async (e) => {
  const file = e.target.files && e.target.files[0];
  if (!file || !currentModalPersonId) return;
  try {
    pendingPhotoBlob = await compressImageToWebP(file);
    const url = URL.createObjectURL(pendingPhotoBlob);
    pendingPhotoId = state.persons[currentModalPersonId].photoId || uid('photo');
    state.persons[currentModalPersonId].photoId = pendingPhotoId;
    photoUrlCache.set(pendingPhotoId, url);
    modalPhotoChanged = true;
    const preview = document.getElementById('photoPreview');
    preview.style.backgroundImage = `url('${url}')`;
    preview.textContent='';
    render();
  } catch (err) {
    alert('Не вдалося підготувати фото: ' + err.message);
  }
  e.target.value='';
};
document.getElementById('modalGotoBtn').onclick = () => { if (currentModalPersonId) { closeModal(); goToLineage(currentModalPersonId); } };
document.getElementById('modalChildBtn').onclick = () => { if (currentModalPersonId) { const pid=currentModalPersonId; closeModal(); openModal('Додати дитину', null, d => { withDraft(draft => { const tFid = findOwnFamily(pid)?.id || createFamilyOnDraft(draft, pid); const nid = uid('p'); draft.persons[nid] = buildPersonRecord(nid, d); draft.families[tFid].children.push({ personId: nid, parentAdultId: pid }); }, 'Додано дитину'); }); } };
document.getElementById('modalPartnerBtn').onclick = () => { if (currentModalPersonId) { const pid=currentModalPersonId; closeModal(); openModal('Додати партнера', null, d => { withDraft(draft => { const tFid = findOwnFamily(pid)?.id || createFamilyOnDraft(draft, pid); const nid = uid('p'); const ps=d.partnerStatus||'married'; delete d.partnerStatus; draft.persons[nid] = buildPersonRecord(nid, d); draft.families[tFid].adults.push(nid); setAdultPartnerStatus(draft.families[tFid], nid, ps); }, 'Додано партнера'); }); } };

['m_firstName','m_lastName','m_maidenName'].forEach(id => {
  const el = document.getElementById(id);
  const handler = () => {
    if (el.dataset.autoClear === '1' && el.dataset.didClear !== '1') {
      el.value = '';
      el.dataset.didClear = '1';
    } else if (el.value) {
      el.select();
    }
  };
  el.addEventListener('focus', handler);
  el.addEventListener('pointerup', () => {
    if (document.activeElement === el && el.dataset.autoClear !== '1' && el.value) setTimeout(() => el.select(), 0);
  });
});

function resetView() {
  fitTreeInView();
  requestAnimationFrame(drawConnectors);
}

function buildJsonPayload() {
  const copy = deepClone(state);
  for (const person of Object.values(copy.persons || {})) {
    if (person && typeof person === 'object') {
      delete person.name;
      delete person.displayName;
    }
  }
  copy.meta.dirty = false;
  copy.meta.lastExportAt = new Date().toISOString();
  copy.meta.checksum = computeStateChecksum(copy);
  return JSON.stringify(copy, null, 2);
}

function buildPhotosPayload() {
  const copy = normalizePhotosState(photosState);
  copy.meta.updatedAt = new Date().toISOString();
  copy.meta.linkedPhotosJsonName = linkedPhotosName || copy.meta.linkedPhotosJsonName || '';
  return JSON.stringify(copy, null, 2);
}

function downloadText(filename, text, type) {
  const blob = new Blob([text], { type: type || 'text/plain;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
}

function downloadBlob(filename, blob, type) {
  const finalBlob = type ? new Blob([blob], { type }) : blob;
  const a = document.createElement('a');
  a.href = URL.createObjectURL(finalBlob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
}

function canUseNativeFileSave() {
  return !!(window.showOpenFilePicker && window.FileSystemFileHandle);
}

function openHandleDb() {
  return new Promise((resolve, reject) => {
    if (!window.indexedDB) { resolve(null); return; }
    const req = indexedDB.open(HANDLE_DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(HANDLE_STORE)) db.createObjectStore(HANDLE_STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error || new Error('IndexedDB unavailable'));
  });
}

async function idbSet(key, value) {
  const db = await openHandleDb();
  if (!db) return;
  await new Promise((resolve, reject) => {
    const tx = db.transaction(HANDLE_STORE, 'readwrite');
    tx.objectStore(HANDLE_STORE).put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error || new Error('IndexedDB write failed'));
  });
  db.close();
}

async function idbGet(key) {
  const db = await openHandleDb();
  if (!db) return null;
  const result = await new Promise((resolve, reject) => {
    const tx = db.transaction(HANDLE_STORE, 'readonly');
    const req = tx.objectStore(HANDLE_STORE).get(key);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error || new Error('IndexedDB read failed'));
  });
  db.close();
  return result;
}

async function idbDelete(key) {
  const db = await openHandleDb();
  if (!db) return;
  await new Promise((resolve, reject) => {
    const tx = db.transaction(HANDLE_STORE, 'readwrite');
    tx.objectStore(HANDLE_STORE).delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error || new Error('IndexedDB delete failed'));
  });
  db.close();
}

async function buildAutoBackupPayload(reason = 'auto') {
  await restorePhotoCacheFromState();
  const photos = {};
  const photoIds = Array.from(new Set(Object.values(state.persons || {}).map(p => p && p.photoId).filter(Boolean)));
  for (const photoId of photoIds) {
    const blob = await getPhotoBlobById(photoId);
    if (!blob) continue;
    photos[photoId] = {
      dataUrl: await blobToDataUrl(blob),
      mime: blob.type || 'image/webp',
      updatedAt: Date.now()
    };
  }
  return {
    version: APP_VERSION,
    createdAt: new Date().toISOString(),
    reason,
    state: deepClone(state),
    photos
  };
}

async function saveAutoBackup(reason = 'auto') {
  if (autoBackupBusy || !isMeaningfulProject(state)) return false;
  autoBackupBusy = true;
  try {
    const payload = await buildAutoBackupPayload(reason);
    await idbSet(AUTO_BACKUP_KEY, payload);
    state.meta.lastAutoBackupAt = payload.createdAt;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    updateInfo();
    return true;
  } catch (err) {
    console.warn('Auto backup failed', err);
    return false;
  } finally {
    autoBackupBusy = false;
  }
}

async function restoreLatestAutoBackup() {
  const payload = await idbGet(AUTO_BACKUP_KEY);
  if (!payload || !payload.state) {
    alert('Автоматичний backup ще не знайдено.');
    return;
  }
  if (!confirm('Відновити останній backup із браузера?')) return;
  const shouldContinue = await confirmReplaceBrowserTree('відновити backup із браузера');
  if (!shouldContinue) return;
  try {
    photosState = normalizePhotosState({ meta: { version: APP_VERSION }, photos: payload.photos || {} });
    localStorage.setItem(PHOTOS_STORAGE_KEY, JSON.stringify(photosState));
    commitState(payload.state, { markDirty: false, linkedJsonName: '', statusText: 'Backup відновлено' });
    await restorePhotoCacheFromState();
    hydrateVisiblePhotos();
    resetView();
  } catch (err) {
    alert('Не вдалося відновити backup: ' + (err.message || err));
  }
}

async function offerAutoBackupRestore() {
  if (isMeaningfulProject(state)) return;
  const payload = await idbGet(AUTO_BACKUP_KEY);
  if (!payload || !payload.state || !isMeaningfulProject(payload.state)) return;
  const when = payload.createdAt ? new Date(payload.createdAt).toLocaleString('uk-UA') : 'невідомо';
  if (confirm(`Знайдено локальний backup від ${when}. Відновити його?`)) {
    photosState = normalizePhotosState({ meta: { version: APP_VERSION }, photos: payload.photos || {} });
    localStorage.setItem(PHOTOS_STORAGE_KEY, JSON.stringify(photosState));
    commitState(payload.state, { markDirty: false, linkedJsonName: '', statusText: 'Backup відновлено' });
    await restorePhotoCacheFromState();
    hydrateVisiblePhotos();
    resetView();
  }
}

async function ensureHandlePermission(handle, mode = 'readwrite') {
  if (!handle) return false;
  if (handle.queryPermission) {
    const current = await handle.queryPermission({ mode });
    if (current === 'granted') return true;
  }
  if (handle.requestPermission) {
    const requested = await handle.requestPermission({ mode });
    return requested === 'granted';
  }
  return true;
}

async function connectJSONFromHandle(handle) {
  linkedJsonHandle = handle;
  const name = handle.name || state.meta?.linkedJsonName || '';
  linkedJsonName = name;
  try { await idbSet(HANDLE_KEY, handle); } catch (err) {}
  state.meta.linkedJsonName = name;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  updateInfo();
  updateProjectStatusUI();
}


async function restoreLinkedJsonHandle() { return; }

function normalizeProjectFilename(name) {
  const cleaned = String(name || 'tree')
    .replace(/(\.project)+\.json$/i, '')
    .replace(/\.json$/i, '')
    .replace(/[^\p{L}\p{N}_-]+/gu, '_')
    .replace(/^_+|_+$/g, '') || 'tree';
  return cleaned + '.project.json';
}

function suggestedJsonFilename(baseName = '') {
  const base = baseName || linkedJsonName || (state.meta?.projectName || 'tree');
  return normalizeProjectFilename(base);
}

async function saveJsonMirror(silent = false) {
  if (!linkedJsonHandle) return false;
  if (mirrorSaveBusy) return false;
  mirrorSaveBusy = true;
  try {
    const text = buildJsonPayload();
    const filename = suggestedJsonFilename();
    const ok = await ensureHandlePermission(linkedJsonHandle, 'readwrite');
    if (!ok) throw new Error('Немає дозволу на запис у підключений файл');
    let writable = null;
    try {
      writable = await linkedJsonHandle.createWritable();
      await writable.write(text);
      await writable.close();
    } catch (err) {
      try { if (writable) await writable.abort(); } catch (_) {}
      const msg = String(err && err.message || err || '');
      if (/cached in an interface object|state had changed since it was read/i.test(msg)) {
        throw new Error('Браузер вважає, що файл змінився зовні. Підключи JSON ще раз.');
      }
      throw err;
    }
    state.meta.dirty = false;
    state.meta.lastExportAt = new Date().toISOString();
    state.meta.linkedJsonName = linkedJsonName || filename;
    state.meta.checksum = computeStateChecksum(state);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    updateSaveBadge('ok', 'Проєкт синхронізовано');
    updateInfo();
    return true;
  } catch (err) {
    updateSaveBadge('err', 'Проєкт не синхронізовано');
    if (!silent) alert('Не вдалося зберегти JSON: ' + err.message);
    return false;
  } finally {
    mirrorSaveBusy = false;
  }
}


async function savePhotosMirror(silent = false) { return true; }

async function connectJSON(e) {
  const file = e.target.files[0];
  if (!file) return;
  linkedJsonHandle = null;
  try { await idbDelete(HANDLE_KEY); } catch (err) { console.warn('Handle clear failed', err); }
  const reader = new FileReader();
  reader.onload = async ev => {
    try {
      const parsed = normalizeState(JSON.parse(ev.target.result || '{}'));
      if (isMeaningfulProject(parsed)) {
        const shouldContinue = await confirmReplaceBrowserTree('відкрити JSON-проєкт');
        if (!shouldContinue) {
          e.target.value = '';
          return;
        }
        commitState(parsed, {
          markDirty: false,
          linkedJsonName: file.name,
          statusText: 'Проєкт відкрито через простий picker (лише читання)'
        });
        resetView();
      } else {
        commitState({ ...state, meta: { ...state.meta, linkedJsonName: file.name } }, {
          markDirty: state.meta?.dirty ?? false,
          linkedJsonName: file.name,
          statusText: 'JSON вибрано через простий picker; прямий запис недоступний'
        });
      }
    } catch (err) {
      commitState({ ...state, meta: { ...state.meta, linkedJsonName: file.name } }, {
        markDirty: state.meta?.dirty ?? false,
        linkedJsonName: file.name,
        statusText: 'JSON вибрано через простий picker; прямий запис недоступний'
      });
    }
    e.target.value = '';
  };
  reader.readAsText(file);
}


async function newProjectWithBackup() {
  if (!isMeaningfulProject(state)) {
    createFirstPerson();
    return;
  }
  const shouldContinue = await confirmReplaceBrowserTree('створити новий порожній проєкт');
  if (!shouldContinue) return;
  try {
    const ged = generateGEDCOM(state);
    const base = suggestedJsonFilename().replace(/\.json$/i, '') || 'tree';
    downloadText(base + '_backup.ged', ged, 'text/plain');
  } catch (err) {
    alert('Не вдалося створити резервний GEDCOM: ' + err.message);
    return;
  }
  if (!confirm('Резервний GEDCOM вивантажено. Створити новий порожній проєкт у браузері?')) return;
  const next = defaultState();
  commitState(next, { markDirty: false, linkedJsonName: linkedJsonName || '', statusText: 'Створено новий порожній проєкт' });
  resetView();
}

async function clearBrowserProject() {
  const shouldContinue = await confirmReplaceBrowserTree('очистити поточне дерево');
  if (!shouldContinue) return;
  if (!confirm('Очистити поточний проєкт у пам\'яті браузера? Резервні копії залишаться.')) return;
  commitState(defaultState(), { markDirty: false, statusText: 'Створено порожній проєкт' });
}

function triggerZipImport() { document.getElementById('zipInput').click(); }
function triggerMergeZip() { document.getElementById('mergeZipInput').click(); }

async function exportProjectZip() {
  try {
    await saveAutoBackup('before-zip-import');
    if (!window.JSZip) throw new Error('Бібліотека JSZip не завантажилась');
    await restorePhotoCacheFromState();
    const zip = new JSZip();
    const base = suggestedJsonFilename().replace(/\.project\.json$/i, '').replace(/\.json$/i, '') || 'tree';
    zip.file('project.json', buildJsonPayload());
    zip.file('tree.ged', generateGEDCOM(state));
    const photoFolder = zip.folder('photos');
    const exported = [];
    const missing = [];
    const seen = new Set();
    for (const person of Object.values(state.persons || {})) {
      const photoId = person && person.photoId;
      if (!photoId || seen.has(photoId)) continue;
      seen.add(photoId);
      const blob = await getPhotoBlobById(photoId);
      if (!blob) {
        missing.push(photoId);
        continue;
      }
      const ext = ((blob.type || '').split('/')[1] || 'webp').replace(/jpeg/i, 'jpg');
      photoFolder.file(`${photoId}.${ext}`, blob);
      exported.push({ photoId, file: `photos/${photoId}.${ext}`, size: blob.size, type: blob.type || 'application/octet-stream' });
    }
    zip.file('ETHOS.txt', ETHOS_TEXT + '\n');
    zip.file('build_manifest.json', JSON.stringify(buildTrustManifest({ exportedAt: new Date().toISOString() }), null, 2));
    zip.file('manifest.json', JSON.stringify({
      version: APP_VERSION,
      exportedAt: new Date().toISOString(),
      persons: Object.keys(state.persons || {}).length,
      families: Object.keys(state.families || {}).length,
      photosExported: exported.length,
      photosMissing: missing
    }, null, 2));
    const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } });
    const fileName = `${base}.zip`;
    try {
      downloadBlob(fileName, blob, 'application/zip');
    } catch (downloadErr) {
      if (navigator.canShare && navigator.share) {
        const file = new File([blob], fileName, { type: 'application/zip' });
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({ title: fileName, files: [file] });
        } else {
          throw downloadErr;
        }
      } else {
        throw downloadErr;
      }
    }
    updateSaveBadge('ok', `ZIP експортовано: фото ${exported.length}`);
  } catch (err) {
    updateSaveBadge('err', 'Помилка ZIP');
    alert('Не вдалося експортувати ZIP: ' + (err && err.message ? err.message : err) + '. Якщо браузер блокує збереження, спробуй відкрити файл напряму в Chrome/Safari і натиснути Експорт ZIP ще раз.');
  }
}

async function importProjectZip(e) {
  const file = e.target.files && e.target.files[0];
  if (!file) return;
  try {
    const shouldContinue = await confirmReplaceBrowserTree('імпортувати ZIP');
    if (!shouldContinue) return;
    if (!window.JSZip) throw new Error('Бібліотека JSZip не завантажилась');
    const zip = await JSZip.loadAsync(file);
    const projectEntry = zip.file('project.json') || Object.values(zip.files).find(entry => /(^|\/)project\.json$/i.test(entry.name) || /\.project\.json$/i.test(entry.name));
    if (!projectEntry) throw new Error('У ZIP не знайдено project.json');
    const projectText = await projectEntry.async('string');
    const importedState = normalizeState(JSON.parse(projectText));
    const nextPhotosState = defaultPhotosState();
    const photoEntries = Object.values(zip.files).filter(entry => !entry.dir && /^photos\//i.test(entry.name));
    for (const entry of photoEntries) {
      const pathParts = entry.name.split('/');
      const filename = pathParts[pathParts.length - 1];
      const photoId = filename.replace(/\.[^.]+$/, '');
      const blob = await entry.async('blob');
      nextPhotosState.photos[photoId] = {
        dataUrl: await blobToDataUrl(blob),
        mime: blob.type || 'image/webp',
        updatedAt: Date.now()
      };
      const old = photoUrlCache.get(photoId);
      if (old) {
        try { URL.revokeObjectURL(old); } catch (err) {}
      }
      photoUrlCache.set(photoId, URL.createObjectURL(blob));
    }
    photosState = normalizePhotosState(nextPhotosState);
    localStorage.setItem(PHOTOS_STORAGE_KEY, JSON.stringify(photosState));
    try { await idbDelete(HANDLE_KEY); } catch (err) {}
    commitState(importedState, { markDirty: true, linkedJsonName: '', statusText: `ZIP імпортовано: фото ${photoEntries.length}` });
    resetView();
  } catch (err) {
    updateSaveBadge('err', 'ZIP пошкоджений');
    alert('Не вдалося імпортувати ZIP: ' + err.message);
  } finally {
    e.target.value = '';
  }
}

async function readProjectZipFile(file) {
  if (!window.JSZip) throw new Error('Бібліотека JSZip не завантажилась');
  const zip = await JSZip.loadAsync(file);
  const projectEntry = zip.file('project.json') || Object.values(zip.files).find(entry => /(^|\/)project\.json$/i.test(entry.name) || /\.project\.json$/i.test(entry.name));
  if (!projectEntry) throw new Error('У ZIP не знайдено project.json');
  const projectText = await projectEntry.async('string');
  const importedState = normalizeState(JSON.parse(projectText));
  const importedPhotos = {};
  const photoEntries = Object.values(zip.files).filter(entry => !entry.dir && /^photos\//i.test(entry.name));
  for (const entry of photoEntries) {
    const filename = entry.name.split('/').pop() || '';
    const photoId = filename.replace(/\.[^.]+$/, '');
    const blob = await entry.async('blob');
    importedPhotos[photoId] = {
      dataUrl: await blobToDataUrl(blob),
      mime: blob.type || 'image/webp',
      updatedAt: Date.now()
    };
  }
  const stableSourceKey = `${safeText(file.name || 'zip')}:${safeText(importedState.meta?.projectName || '')}:${safeText(importedState.homeId || '')}`;
  const sourceKey = `${stableSourceKey}:${simpleHash(projectText)}`;
  return { state: importedState, photos: importedPhotos, fileName: file.name, sourceKey, stableSourceKey };
}

function normalizeMatchText(value) {
  return safeText(value).toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
}

function normalizedPersonParts(person) {
  return {
    first: normalizeMatchText(person?.firstName || person?.name || ''),
    last: normalizeMatchText(person?.lastName || ''),
    maiden: normalizeMatchText(person?.maidenName || ''),
    birth: extractYear(person?.birth),
    death: extractYear(person?.death),
    gender: person?.gender || 'unknown'
  };
}

function normalizedPersonLabel(person) {
  return normalizeMatchText(composeDisplayName(person));
}

function getPersonContextParts(personId, currentState) {
  const parents = [];
  const partners = [];
  const children = [];
  for (const fam of Object.values(currentState.families || {})) {
    const adultIds = fam.adults || [];
    const childIds = (fam.children || []).map(ch => ch.personId).filter(Boolean);
    if (childIds.includes(personId)) {
      adultIds.forEach(pid => {
        const p = currentState.persons[pid];
        if (p) parents.push(normalizedPersonLabel(p));
      });
    }
    if (adultIds.includes(personId)) {
      adultIds.forEach(pid => {
        if (pid !== personId && currentState.persons[pid]) partners.push(normalizedPersonLabel(currentState.persons[pid]));
      });
      childIds.forEach(pid => {
        const p = currentState.persons[pid];
        if (p) children.push(normalizedPersonLabel(p));
      });
    }
  }
  return {
    parents: Array.from(new Set(parents.filter(Boolean))),
    partners: Array.from(new Set(partners.filter(Boolean))),
    children: Array.from(new Set(children.filter(Boolean)))
  };
}

function countSharedItems(a = [], b = []) {
  const set = new Set(b);
  return a.filter(item => set.has(item)).length;
}

function formatContextHint(person, currentState) {
  const ctx = getPersonContextParts(person.id, currentState);
  const parts = [];
  if (ctx.parents.length) parts.push(`батьки: ${ctx.parents.slice(0, 2).join(', ')}`);
  if (ctx.partners.length) parts.push(`партнер: ${ctx.partners.slice(0, 2).join(', ')}`);
  if (ctx.children.length) parts.push(`діти: ${ctx.children.slice(0, 3).join(', ')}`);
  return parts.join(' · ');
}

function personContextScore(a, b, aState, bState) {
  const ac = getPersonContextParts(a.id, aState);
  const bc = getPersonContextParts(b.id, bState);
  let score = 0;
  score += countSharedItems(ac.parents, bc.parents) * 4;
  score += countSharedItems(ac.partners, bc.partners) * 4;
  score += countSharedItems(ac.children, bc.children) * 3;
  if (ac.parents.length && bc.parents.length && !countSharedItems(ac.parents, bc.parents)) score -= 2;
  if (ac.partners.length && bc.partners.length && !countSharedItems(ac.partners, bc.partners)) score -= 2;
  return score;
}

function personMatchScore(a, b, aState = pendingMerge?.state || state, bState = state) {
  const ap = normalizedPersonParts(a);
  const bp = normalizedPersonParts(b);
  if (!ap.first || !bp.first) return 0;
  let score = 0;
  if (ap.first === bp.first) score += 5;
  else if (ap.first.split(/\s+/).some(part => part && bp.first.split(/\s+/).includes(part))) score += 2;
  if (ap.last && bp.last && ap.last === bp.last) score += 5;
  else if (ap.last && bp.maiden && ap.last === bp.maiden) score += 2;
  else if (ap.maiden && bp.last && ap.maiden === bp.last) score += 2;
  else if (ap.maiden && bp.maiden && ap.maiden === bp.maiden) score += 2;
  if (ap.gender !== 'unknown' && bp.gender !== 'unknown' && ap.gender === bp.gender) score += 1;
  if (ap.gender !== 'unknown' && bp.gender !== 'unknown' && ap.gender !== bp.gender) score -= 4;
  if (ap.birth && bp.birth) score += ap.birth === bp.birth ? 4 : -6;
  if (ap.death && bp.death) score += ap.death === bp.death ? 2 : -3;
  if (!ap.last && !bp.last) score -= 2;
  score += personContextScore(a, b, aState, bState);
  return score;
}

function getPartnerIdsInFamilies(families, pid) {
  const partners = new Set();
  for (const fam of Object.values(families || {})) {
    if (!(fam.adults || []).includes(pid)) continue;
    (fam.adults || []).forEach(other => {
      if (other !== pid) partners.add(other);
    });
  }
  return Array.from(partners);
}

function hasMatchedPartnerContext(importedState, importedPerson, existingPerson) {
  if (!pendingMerge || !pendingMerge.proposedMap) return false;
  const importedPartners = getPartnerIdsInFamilies(importedState.families, importedPerson.id);
  const existingPartners = getPartnerIdsInFamilies(state.families, existingPerson.id);
  return importedPartners.some(importedPartnerId => {
    const mappedPartnerId = pendingMerge.proposedMap.get(importedPartnerId);
    return mappedPartnerId && existingPartners.includes(mappedPartnerId);
  });
}

function isConfidentMergeMatch(importedPerson, existingPerson, score, importedState = pendingMerge?.state) {
  if (score >= 999) return true;
  const ap = normalizedPersonParts(importedPerson);
  const bp = normalizedPersonParts(existingPerson);
  const fullNameMatch = ap.first && bp.first && ap.first === bp.first && ap.last && bp.last && ap.last === bp.last;
  const hasExactDate = (ap.birth && bp.birth && ap.birth === bp.birth) || (ap.death && bp.death && ap.death === bp.death);
  const hasNoDateConflict = (!ap.birth || !bp.birth || ap.birth === bp.birth) && (!ap.death || !bp.death || ap.death === bp.death);
  const genderOk = ap.gender === 'unknown' || bp.gender === 'unknown' || ap.gender === bp.gender;
  const familyContextOk = importedState && hasMatchedPartnerContext(importedState, importedPerson, existingPerson);
  return fullNameMatch && hasNoDateConflict && genderOk && (hasExactDate || familyContextOk) && score >= 10;
}

function isRepeatImportMatch(importedPerson, existingPerson, importedState, existingState) {
  const ap = normalizedPersonParts(importedPerson);
  const bp = normalizedPersonParts(existingPerson);
  const nameOk = ap.first && bp.first && ap.first === bp.first && ap.last === bp.last && ap.maiden === bp.maiden;
  if (!nameOk) return false;
  const genderOk = ap.gender === 'unknown' || bp.gender === 'unknown' || ap.gender === bp.gender;
  if (!genderOk) return false;
  const datesOk = ap.birth === bp.birth && ap.death === bp.death;
  if (!datesOk) return false;
  const importedCtx = getPersonContextParts(importedPerson.id, importedState);
  const existingCtx = getPersonContextParts(existingPerson.id, existingState);
  const hasContext = importedCtx.parents.length || importedCtx.partners.length || importedCtx.children.length;
  const sharedContext =
    countSharedItems(importedCtx.parents, existingCtx.parents) +
    countSharedItems(importedCtx.partners, existingCtx.partners) +
    countSharedItems(importedCtx.children, existingCtx.children);
  return !!(ap.birth || ap.death || (hasContext && sharedContext > 0));
}

function findRepeatImportMatch(importedPerson, importedState, existingState) {
  const matches = Object.values(existingState.persons || {}).filter(existing => isRepeatImportMatch(importedPerson, existing, importedState, existingState));
  return matches.length === 1 ? matches[0] : null;
}

function compatibleLastNames(a, b) {
  const ap = normalizedPersonParts(a);
  const bp = normalizedPersonParts(b);
  if (!ap.last && !ap.maiden && !bp.last && !bp.maiden) return true;
  const aNames = [ap.last, ap.maiden].filter(Boolean);
  const bNames = [bp.last, bp.maiden].filter(Boolean);
  return aNames.some(name => bNames.includes(name));
}

function duplicateContextDetails(a, b) {
  const ac = getPersonContextParts(a.id, state);
  const bc = getPersonContextParts(b.id, state);
  return {
    parents: countSharedItems(ac.parents, bc.parents),
    partners: countSharedItems(ac.partners, bc.partners),
    children: countSharedItems(ac.children, bc.children),
    a: ac,
    b: bc
  };
}

function getChildIdsOfPerson(personId, families = state.families) {
  const children = new Set();
  for (const fam of Object.values(families || {})) {
    if (!(fam.adults || []).includes(personId)) continue;
    (fam.children || []).forEach(ch => {
      if (ch && ch.personId) children.add(ch.personId);
    });
  }
  return Array.from(children);
}

function areAncestorAndDescendant(aId, bId, families = state.families) {
  if (!aId || !bId || aId === bId) return false;
  const queue = getChildIdsOfPerson(aId, families);
  const seen = new Set();
  while (queue.length) {
    const pid = queue.shift();
    if (!pid || seen.has(pid)) continue;
    if (pid === bId) return true;
    seen.add(pid);
    queue.push(...getChildIdsOfPerson(pid, families));
  }
  return false;
}

function hasGenerationConflict(a, b) {
  return areAncestorAndDescendant(a.id, b.id) || areAncestorAndDescendant(b.id, a.id);
}

function personHasParentNamed(person, possibleParent) {
  const target = normalizedPersonLabel(possibleParent);
  if (!target) return false;
  const parents = getPersonContextParts(person.id, state).parents || [];
  return parents.includes(target);
}

function hasNamedParentConflict(a, b) {
  return personHasParentNamed(a, b) || personHasParentNamed(b, a);
}

function duplicateConfidence(a, b) {
  const ap = normalizedPersonParts(a);
  const bp = normalizedPersonParts(b);
  if (!ap.first || !bp.first || ap.first !== bp.first) return null;
  if (hasGenerationConflict(a, b)) return null;
  if (hasNamedParentConflict(a, b)) return null;
  if (!compatibleLastNames(a, b)) return null;
  if (ap.gender !== 'unknown' && bp.gender !== 'unknown' && ap.gender !== bp.gender) return null;
  if (ap.birth && bp.birth && ap.birth !== bp.birth) return null;
  if (ap.death && bp.death && ap.death !== bp.death) return null;

  const ctx = duplicateContextDetails(a, b);
  const sharedContext = ctx.parents + ctx.partners + ctx.children;
  const exactBirth = ap.birth && bp.birth && ap.birth === bp.birth;
  const exactDeath = ap.death && bp.death && ap.death === bp.death;
  const sameFullName = ap.first === bp.first && (ap.last || ap.maiden || bp.last || bp.maiden);
  let score = personMatchScore(a, b, state, state);

  if (sameFullName) score += 4;
  if (exactBirth) score += 6;
  if (exactDeath) score += 3;
  if (sharedContext) score += sharedContext * 5;

  if (!exactBirth && !exactDeath && !sharedContext) return null;
  const strong = score >= 18 && (exactBirth || exactDeath || sharedContext > 0);
  if (!strong) return null;

  return {
    score,
    level: 'strong',
    sharedContext,
    reason: [
      sameFullName ? 'однакове ім’я/прізвище' : '',
      exactBirth ? 'однакове народження' : '',
      exactDeath ? 'однакова смерть' : '',
      ctx.parents ? 'спільні батьки' : '',
      ctx.partners ? 'спільний партнер' : '',
      ctx.children ? 'спільні діти' : ''
    ].filter(Boolean).join(', ') || 'схожі записи'
  };
}

function labelCounts(labels) {
  const counts = {};
  (labels || []).forEach(label => {
    if (!label) return;
    counts[label] = (counts[label] || 0) + 1;
  });
  return counts;
}

function sameLabelCounts(a, b) {
  const ac = labelCounts(a);
  const bc = labelCounts(b);
  const keys = Array.from(new Set([...Object.keys(ac), ...Object.keys(bc)]));
  return keys.every(key => ac[key] === bc[key]);
}

function sharedLabelCount(a, b) {
  const ac = labelCounts(a);
  const bc = labelCounts(b);
  return Object.keys(ac).reduce((sum, key) => sum + Math.min(ac[key] || 0, bc[key] || 0), 0);
}

function familyRoleLabels(fam) {
  const adultLabels = (fam.adults || [])
    .map(pid => state.persons[pid])
    .filter(Boolean)
    .map(normalizedPersonLabel)
    .filter(Boolean);
  const childLabels = (fam.children || [])
    .map(ch => state.persons[ch.personId])
    .filter(Boolean)
    .map(normalizedPersonLabel)
    .filter(Boolean);
  return { adultLabels, childLabels };
}

function familyLooksSameByLabels(a, b) {
  const ar = familyRoleLabels(a);
  const br = familyRoleLabels(b);
  if (ar.adultLabels.length < 2 || br.adultLabels.length < 2) return false;
  if (!sameLabelCounts(ar.adultLabels, br.adultLabels)) return false;
  const sharedChildren = sharedLabelCount(ar.childLabels, br.childLabels);
  if (!ar.childLabels.length && !br.childLabels.length) return true;
  return sharedChildren > 0;
}

function familiesHaveSameAdultPair(a, b) {
  const ar = familyRoleLabels(a);
  const br = familyRoleLabels(b);
  return ar.adultLabels.length === 2 && br.adultLabels.length === 2 && sameLabelCounts(ar.adultLabels, br.adultLabels);
}

function peopleLookSameInRepeatedFamily(a, b) {
  if (!a || !b || a.id === b.id) return false;
  const ap = normalizedPersonParts(a);
  const bp = normalizedPersonParts(b);
  if (!ap.first || !bp.first || ap.first !== bp.first) return false;
  if (ap.gender !== 'unknown' && bp.gender !== 'unknown' && ap.gender !== bp.gender) return false;
  if (ap.birth && bp.birth && ap.birth !== bp.birth) return false;
  if (ap.death && bp.death && ap.death !== bp.death) return false;
  if (hasGenerationConflict(a, b) || hasNamedParentConflict(a, b)) return false;
  const sameLabel = normalizedPersonLabel(a) === normalizedPersonLabel(b);
  const sameBirth = ap.birth && bp.birth && ap.birth === bp.birth;
  const sameDeath = ap.death && bp.death && ap.death === bp.death;
  const samePhoto = a.photoId && b.photoId && a.photoId === b.photoId;
  return sameLabel || sameBirth || sameDeath || samePhoto || compatibleLastNames(a, b);
}

function matchPeopleInRepeatedFamilies(peopleA, peopleB) {
  const matches = [];
  const usedB = new Set();
  (peopleA || []).forEach(aId => {
    const a = state.persons[aId];
    if (!a) return;
    const candidates = (peopleB || [])
      .filter(bId => !usedB.has(bId))
      .map(bId => state.persons[bId])
      .filter(b => peopleLookSameInRepeatedFamily(a, b))
      .map(b => ({ person: b, score: personMatchScore(a, b, state, state) }))
      .sort((x, y) => y.score - x.score);
    const best = candidates[0];
    if (!best) return;
    usedB.add(best.person.id);
    matches.push({ a, b: best.person, score: Math.max(80, best.score) });
  });
  return matches;
}

function addMatchedDuplicatePairs(targetPairs, matches, reason) {
  matches.forEach(match => {
    targetPairs.push({
      a: match.a,
      b: match.b,
      score: match.score,
      level: 'strong',
      sharedContext: 1,
      reason
    });
  });
}

function addRoleDuplicatePairs(targetPairs, peopleA, peopleB, reason) {
  const usedB = new Set();
  peopleA.forEach(aId => {
    const a = state.persons[aId];
    if (!a) return;
    const label = normalizedPersonLabel(a);
    const bId = peopleB.find(pid => {
      if (usedB.has(pid)) return false;
      const b = state.persons[pid];
      return b && pid !== aId && normalizedPersonLabel(b) === label;
    });
    if (!bId) return;
    usedB.add(bId);
    const b = state.persons[bId];
    targetPairs.push({
      a,
      b,
      score: 120,
      level: 'strong',
      sharedContext: 1,
      reason
    });
  });
}

function findDuplicateFamilyPairs() {
  const families = Object.values(state.families || {});
  const pairs = [];
  for (let i = 0; i < families.length; i++) {
    for (let j = i + 1; j < families.length; j++) {
      const a = families[i], b = families[j];
      if (!familyLooksSameByLabels(a, b) && !familiesHaveSameAdultPair(a, b)) continue;
      addRoleDuplicatePairs(pairs, a.adults || [], b.adults || [], 'повторена родина: однакові дорослі');
      addRoleDuplicatePairs(pairs, (a.children || []).map(ch => ch.personId), (b.children || []).map(ch => ch.personId), 'повторена родина: однакові діти');
    }
  }
  return pairs;
}

function findRepeatedFamilyBlockPairs() {
  const families = Object.values(state.families || {});
  const pairs = [];
  for (let i = 0; i < families.length; i++) {
    for (let j = i + 1; j < families.length; j++) {
      const a = families[i], b = families[j];
      const adultMatches = matchPeopleInRepeatedFamilies(a.adults || [], b.adults || []);
      const childMatches = matchPeopleInRepeatedFamilies((a.children || []).map(ch => ch.personId), (b.children || []).map(ch => ch.personId));
      const familyLike = familyLooksSameByLabels(a, b) || familiesHaveSameAdultPair(a, b) || adultMatches.length >= 2 || (adultMatches.length >= 1 && childMatches.length >= 1);
      if (!familyLike) continue;
      addMatchedDuplicatePairs(pairs, adultMatches, 'повторена родина: однакові дорослі');
      addMatchedDuplicatePairs(pairs, childMatches, 'повторена родина: однакові діти');
    }
  }
  return pairs;
}

function findDuplicatePairs() {
  const persons = Object.values(state.persons || {});
  const pairs = findRepeatedFamilyBlockPairs();
  for (let i = 0; i < persons.length; i++) {
    for (let j = i + 1; j < persons.length; j++) {
      const confidence = duplicateConfidence(persons[i], persons[j]);
      if (confidence) pairs.push({ a: persons[i], b: persons[j], ...confidence });
    }
  }
  const seen = new Set();
  return pairs
    .filter(pair => {
      const key = [pair.a.id, pair.b.id].sort().join('|');
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((x, y) => y.score - x.score);
}

function groupDuplicatePairs(pairs) {
  const strongPairs = pairs.filter(pair => pair.level === 'strong');
  const parent = new Map();
  const find = id => {
    if (!parent.has(id)) parent.set(id, id);
    if (parent.get(id) !== id) parent.set(id, find(parent.get(id)));
    return parent.get(id);
  };
  const unite = (a, b) => {
    const ra = find(a), rb = find(b);
    if (ra !== rb) parent.set(rb, ra);
  };
  strongPairs.forEach(pair => unite(pair.a.id, pair.b.id));
  const groups = new Map();
  strongPairs.forEach(pair => {
    [pair.a, pair.b].forEach(person => {
      const root = find(person.id);
      if (!groups.has(root)) groups.set(root, new Map());
      groups.get(root).set(person.id, person);
    });
  });
  return Array.from(groups.values()).map(map => Array.from(map.values()));
}

function duplicatePersonLine(person) {
  const context = formatContextHint(person, state);
  return `
    <div style="padding:8px 0; border-top:1px solid #f1f5f9;">
      <div style="font-weight:700">${escapeHtml(composeDisplayName(person))} <span class="small">${escapeHtml(formatYearsShort(person))}</span></div>
      <div class="small">${escapeHtml(context || 'без близького сімейного контексту')}</div>
      <button class="btn secondary" type="button" style="margin-top:6px; padding:6px 10px;" onclick="closeDuplicateFinder(); goToLineage('${escapeHtml(person.id)}')">Відкрити рід</button>
    </div>`;
}

function getPersonContextPartsExcept(personId, currentState, excludedIds = new Set()) {
  const parents = [];
  const partners = [];
  const children = [];
  for (const fam of Object.values(currentState.families || {})) {
    const adultIds = fam.adults || [];
    const childIds = (fam.children || []).map(ch => ch.personId).filter(Boolean);
    if (childIds.includes(personId)) {
      adultIds.forEach(pid => {
        if (excludedIds.has(pid)) return;
        const p = currentState.persons[pid];
        if (p) parents.push(normalizedPersonLabel(p));
      });
    }
    if (adultIds.includes(personId)) {
      adultIds.forEach(pid => {
        if (pid === personId || excludedIds.has(pid)) return;
        if (currentState.persons[pid]) partners.push(normalizedPersonLabel(currentState.persons[pid]));
      });
      childIds.forEach(pid => {
        if (excludedIds.has(pid)) return;
        const p = currentState.persons[pid];
        if (p) children.push(normalizedPersonLabel(p));
      });
    }
  }
  return {
    parents: Array.from(new Set(parents.filter(Boolean))),
    partners: Array.from(new Set(partners.filter(Boolean))),
    children: Array.from(new Set(children.filter(Boolean)))
  };
}

function formatDuplicateContextHint(person, excludedIds) {
  const ctx = getPersonContextPartsExcept(person.id, state, excludedIds);
  const parts = [];
  if (ctx.parents.length) parts.push(`батьки: ${ctx.parents.slice(0, 2).join(', ')}`);
  if (ctx.partners.length) parts.push(`партнер: ${ctx.partners.slice(0, 2).join(', ')}`);
  if (ctx.children.length) parts.push(`діти: ${ctx.children.slice(0, 3).join(', ')}`);
  return parts.join(' · ');
}

function duplicateNameDetails(person) {
  const parts = [];
  if (safeText(person.lastName || '').trim()) parts.push(`прізвище: ${safeText(person.lastName).trim()}`);
  if (safeText(person.maidenName || '').trim()) parts.push(`дівоче: ${safeText(person.maidenName).trim()}`);
  return parts.join(' · ');
}

function duplicatePersonLineForGroup(person, groupIds, groupIndex, isPrimary) {
  const context = formatDuplicateContextHint(person, groupIds);
  const nameDetails = duplicateNameDetails(person);
  return `
    <div style="padding:8px 0; border-top:1px solid #f1f5f9;">
      <label style="display:flex; gap:8px; align-items:flex-start; font-weight:700;">
        <input type="radio" name="duplicate-primary-${groupIndex}" value="${escapeHtml(person.id)}" ${isPrimary ? 'checked' : ''} style="width:auto; margin:2px 0 0;">
        <span>${escapeHtml(composeDisplayName(person))} <span class="small">${escapeHtml(formatYearsShort(person))}</span></span>
      </label>
      ${nameDetails ? `<div class="small">${escapeHtml(nameDetails)}</div>` : ''}
      <div class="small">${escapeHtml(context || 'без близького сімейного контексту поза цією групою')}</div>
      <button class="btn secondary" type="button" style="margin-top:6px; padding:6px 10px;" onclick="closeDuplicateFinder(); goToLineage('${escapeHtml(person.id)}')">Відкрити рід</button>
    </div>`;
}

function personCompletenessScore(person) {
  let score = 0;
  ['firstName','lastName','maidenName','birth','death','deathStatus','note','photoId'].forEach(key => {
    if (safeText(person?.[key] || '').trim()) score += 1;
  });
  const ctx = getPersonContextParts(person.id, state);
  score += ctx.parents.length + ctx.partners.length + ctx.children.length;
  return score;
}

function chooseDefaultDuplicatePrimary(group) {
  return group.slice().sort((a, b) => {
    const score = personCompletenessScore(b) - personCompletenessScore(a);
    if (score) return score;
    return safeText(a.id).localeCompare(safeText(b.id));
  })[0]?.id || group[0]?.id || '';
}

function renderDuplicateFinder() {
  const summary = document.getElementById('duplicateSummary');
  const list = document.getElementById('duplicateList');
  const pairs = findDuplicatePairs();
  const strongCount = pairs.filter(pair => pair.level === 'strong').length;
  const groups = groupDuplicatePairs(pairs);
  summary.textContent = `Знайдено груп: ${groups.length}. Сильних збігів: ${strongCount}. Пошук лише показує підозри й нічого сам не об’єднує.`;
  if (!groups.length) {
    list.innerHTML = '<div style="padding:14px;">Підозрілих дублікатів не знайдено.</div>';
    return;
  }
  list.innerHTML = groups.map((group, index) => {
    const groupPairs = pairs.filter(pair => group.some(p => p.id === pair.a.id) && group.some(p => p.id === pair.b.id));
    const best = groupPairs[0];
    const label = best.level === 'strong' ? 'сильний збіг' : 'можливий збіг';
    const groupIds = new Set(group.map(person => person.id));
    const primaryId = chooseDefaultDuplicatePrimary(group);
    const encodedIds = group.map(person => encodeURIComponent(person.id)).join(',');
    return `
      <div style="padding:12px; border-bottom:1px solid #e2e8f0;">
        <div style="display:flex; justify-content:space-between; gap:10px; align-items:flex-start;">
          <div style="font-weight:800">Група ${index + 1}: ${group.length} записи</div>
          <div class="small">${label} · ${Math.round(best.score)} · ${escapeHtml(best.reason)}</div>
        </div>
        ${group.map(person => duplicatePersonLineForGroup(person, groupIds, index, person.id === primaryId)).join('')}
        <button class="btn" type="button" style="width:100%; margin-top:10px;" onclick="mergeDuplicateGroupFromDialog(${index}, '${encodedIds}')">Об’єднати вибране</button>
      </div>`;
  }).join('');
}

function mergeLocalPersonFields(target, source) {
  ['firstName','lastName','maidenName','birth','death','deathStatus','note','photoId'].forEach(key => {
    if (!safeText(target[key] || '').trim() && safeText(source[key] || '').trim()) target[key] = source[key];
  });
  if ((!target.gender || target.gender === 'unknown') && source.gender) target.gender = source.gender;
  addImportKeys(target, source.importKeys || []);
}

function uniqChildren(children) {
  const seen = new Set();
  return (children || []).filter(ch => {
    const pid = ch && ch.personId;
    if (!pid || seen.has(pid)) return false;
    seen.add(pid);
    return true;
  }).map(ch => ({ personId: ch.personId }));
}

function replacePersonIdInFamilies(families, fromIds, toId) {
  const fromSet = new Set(fromIds || []);
  for (const fam of Object.values(families || {})) {
    fam.adults = Array.from(new Set((fam.adults || []).map(pid => fromSet.has(pid) ? toId : pid))).filter(Boolean);
    fam.children = uniqChildren((fam.children || []).map(ch => ({
      personId: fromSet.has(ch.personId) ? toId : ch.personId
    })));
    if ((fam.adults || []).includes(toId)) {
      fam.children = (fam.children || []).filter(ch => ch.personId !== toId);
    }
  }
}

function mergeParentFamiliesForChild(next, childId) {
  const parentFamilies = Object.values(next.families || {}).filter(fam => (fam.children || []).some(ch => ch.personId === childId));
  if (parentFamilies.length <= 1) return;
  const base = parentFamilies.slice().sort((a, b) => (b.adults || []).length - (a.adults || []).length)[0];
  parentFamilies.forEach(fam => {
    if (fam.id === base.id) return;
    const combinedAdults = Array.from(new Set([...(base.adults || []), ...(fam.adults || [])]));
    const combinedChildren = uniqChildren([...(base.children || []), ...(fam.children || [])]);
    const childIds = combinedChildren.map(ch => ch.personId);
    base.adults = combinedAdults.filter(pid => !wouldCreateFamilyCycle(next.families, [pid], childIds));
    base.children = combinedChildren;
    addImportKeys(base, fam.importKeys || []);
    delete next.families[fam.id];
  });
}

function removeEmptyAndExactDuplicateFamilies(next) {
  for (const [fid, fam] of Object.entries(next.families || {})) {
    fam.adults = Array.from(new Set(fam.adults || [])).filter(pid => next.persons[pid]);
    fam.children = uniqChildren(fam.children || []).filter(ch => next.persons[ch.personId]);
    if (!fam.adults.length && !fam.children.length) delete next.families[fid];
  }
  const ids = Object.keys(next.families || {});
  for (let i = 0; i < ids.length; i++) {
    const a = next.families[ids[i]];
    if (!a) continue;
    for (let j = i + 1; j < ids.length; j++) {
      const b = next.families[ids[j]];
      if (!b) continue;
      const sameAdults = sameIdSet((a.adults || []).slice().sort(), (b.adults || []).slice().sort());
      const sameChildren = sameIdSet((a.children || []).map(ch => ch.personId).sort(), (b.children || []).map(ch => ch.personId).sort());
      if (sameAdults && sameChildren) {
        addImportKeys(a, b.importKeys || []);
        delete next.families[b.id];
      }
    }
  }
}


function getStrongDuplicateGroups() {
  const strongPairs = findDuplicatePairs().filter(pair => pair.level === 'strong' && pair.score >= 18);
  return groupDuplicatePairs(strongPairs).filter(group => group.length > 1);
}

async function mergeDuplicateGroupSilently(ids, primaryId, next) {
  const uniqueIds = Array.from(new Set(ids || [])).filter(id => next.persons[id]);
  if (uniqueIds.length < 2 || !primaryId || !uniqueIds.includes(primaryId) || !next.persons[primaryId]) return 0;
  const primary = next.persons[primaryId];
  const duplicateIds = uniqueIds.filter(id => id !== primaryId && next.persons[id]);
  duplicateIds.forEach(id => mergeLocalPersonFields(primary, next.persons[id]));
  replacePersonIdInFamilies(next.families, duplicateIds, primaryId);
  duplicateIds.forEach(id => delete next.persons[id]);
  mergeParentFamiliesForChild(next, primaryId);
  removeEmptyAndExactDuplicateFamilies(next);
  next.families = removeCyclicAdultLinks(next.families);
  return duplicateIds.length;
}

async function mergeAllStrongDuplicatesFromDialog() {
  const groups = getStrongDuplicateGroups();
  if (!groups.length) {
    alert('Безпечних сильних збігів для автоматичного об’єднання не знайдено.');
    return;
  }
  const preview = groups.slice(0, 8).map((group, i) => {
    const primaryId = chooseDefaultDuplicatePrimary(group);
    return `${i + 1}. ${composeDisplayName(state.persons[primaryId])} — ${group.length} записи`;
  }).join('\n');
  const more = groups.length > 8 ? `\n…і ще ${groups.length - 8} груп` : '';
  if (!confirm(`Об’єднати всі БЕЗПЕЧНІ дублікати?\n\nБуде об’єднано лише сильні збіги: однакові дати/контекст/родина без конфлікту поколінь.\nСумнівні збіги залишаться для ручної перевірки.\n\n${preview}${more}\n\nПеред зміною буде створено резервну копію.`)) return;

  try {
    await saveAutoBackup('before-duplicate-merge-all-safe');
    const next = deepClone(state);
    let mergedCount = 0;
    groups.forEach(group => {
      const aliveIds = group.map(person => person.id).filter(id => next.persons[id]);
      if (aliveIds.length < 2) return;
      let primaryId = chooseDefaultDuplicatePrimary(aliveIds.map(id => next.persons[id]));
      if (!next.persons[primaryId]) primaryId = aliveIds[0];
      mergedCount += mergeDuplicateGroupSilently(aliveIds, primaryId, next);
    });
    removeEmptyAndExactDuplicateFamilies(next);
    next.families = removeCyclicAdultLinks(next.families);
    if (next.homeId && !next.families[next.homeId]) next.homeId = chooseBestHomeFamily(next.families);
    if (next.homeId) next.homeId = findTopAncestorFamilyForFamily(next.families, next.homeId);
    commitState(next, { markDirty: true, linkedJsonName: '', statusText: `Безпечно об’єднано дублікатів: ${mergedCount}` });
    renderDuplicateFinder();
    alert(`Готово. Безпечно об’єднано записів: ${mergedCount}. Сумнівні збіги залишені без змін.`);
  } catch (err) {
    updateSaveBadge('err', 'Помилка об’єднання');
    alert('Не вдалося об’єднати всі безпечні дублікати: ' + (err && err.message ? err.message : err));
  }
}

async function mergeDuplicateGroupFromDialog(groupIndex, encodedIds) {
  const ids = safeText(encodedIds || '').split(',').map(value => decodeURIComponent(value)).filter(Boolean);
  const selected = document.querySelector(`input[name="duplicate-primary-${groupIndex}"]:checked`);
  const primaryId = selected ? selected.value : ids[0];
  await mergeDuplicateGroup(ids, primaryId);
}

async function mergeDuplicateGroup(ids, primaryId) {
  const uniqueIds = Array.from(new Set(ids || [])).filter(Boolean);
  if (uniqueIds.length < 2 || !primaryId || !uniqueIds.includes(primaryId)) return;
  const names = uniqueIds.map(id => state.persons[id]).filter(Boolean).map(composeDisplayName).join(', ');
  if (!confirm(`Об’єднати ці записи в одну особу?\n\nГоловна особа: ${composeDisplayName(state.persons[primaryId])}\nГрупа: ${names}\n\nПеред зміною буде створено резервну копію.`)) return;

  try {
    await saveAutoBackup('before-duplicate-merge');
    const next = deepClone(state);
    const primary = next.persons[primaryId];
    if (!primary) throw new Error('Головну особу не знайдено');
    const duplicateIds = uniqueIds.filter(id => id !== primaryId && next.persons[id]);
    duplicateIds.forEach(id => mergeLocalPersonFields(primary, next.persons[id]));
    replacePersonIdInFamilies(next.families, duplicateIds, primaryId);
    duplicateIds.forEach(id => delete next.persons[id]);
    mergeParentFamiliesForChild(next, primaryId);
    removeEmptyAndExactDuplicateFamilies(next);
    next.families = removeCyclicAdultLinks(next.families);
    if (next.homeId && !next.families[next.homeId]) next.homeId = chooseBestHomeFamily(next.families);
    if (next.homeId) next.homeId = findTopAncestorFamilyForFamily(next.families, next.homeId);
    commitState(next, { markDirty: true, linkedJsonName: '', statusText: `Об’єднано дублікати: ${duplicateIds.length}` });
    renderDuplicateFinder();
    alert(`Готово. Об’єднано записів: ${duplicateIds.length}.`);
  } catch (err) {
    updateSaveBadge('err', 'Помилка об’єднання');
    alert('Не вдалося об’єднати дублікати: ' + (err && err.message ? err.message : err));
  }
}

function openDuplicateFinder() {
  renderDuplicateFinder();
  document.getElementById('duplicateModal').style.display = 'flex';
}

function refreshDuplicateFinder() {
  renderDuplicateFinder();
}

function closeDuplicateFinder() {
  document.getElementById('duplicateModal').style.display = 'none';
}

function findMergeCandidates(importedState, sourceKeys = []) {
  const candidates = Object.values(importedState.persons || {}).map(person => {
    const knownPerson = findRecordByImportKeys(state.persons, makeImportKeys(sourceKeys, person.id));
    const matches = Object.values(state.persons || {})
      .map(existing => ({ person: existing, score: personMatchScore(person, existing, importedState, state) }))
      .concat(knownPerson ? [{ person: knownPerson, score: 999 }] : [])
      .filter((match, index, all) => all.findIndex(item => item.person.id === match.person.id) === index)
      .filter(match => match.score >= 7)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);
    return { person, matches };
  });
  const proposedMap = new Map();
  candidates.forEach(item => {
    const best = item.matches.find(match => {
      const ap = normalizedPersonParts(item.person);
      const bp = normalizedPersonParts(match.person);
      const fullNameMatch = ap.first && bp.first && ap.first === bp.first && ap.last && bp.last && ap.last === bp.last;
      const hasExactDate = (ap.birth && bp.birth && ap.birth === bp.birth) || (ap.death && bp.death && ap.death === bp.death);
      const hasNoDateConflict = (!ap.birth || !bp.birth || ap.birth === bp.birth) && (!ap.death || !bp.death || ap.death === bp.death);
      const genderOk = ap.gender === 'unknown' || bp.gender === 'unknown' || ap.gender === bp.gender;
      return match.score >= 999 || (fullNameMatch && hasExactDate && hasNoDateConflict && genderOk && match.score >= 10);
    });
    if (best) proposedMap.set(item.person.id, best.person.id);
  });
  pendingMerge = { ...(pendingMerge || {}), proposedMap };
  return candidates;
}

function renderMergeDialog() {
  const modal = document.getElementById('mergeModal');
  const step = document.getElementById('mergeStepLine');
  const summary = document.getElementById('mergeSummary');
  const list = document.getElementById('mergeMatches');
  const applyBtn = document.getElementById('mergeApplyBtn');
  if (!pendingMerge) {
    step.textContent = 'Етап 1: вибери ZIP іншого дерева.';
    summary.textContent = '';
    list.style.display = 'none';
    list.innerHTML = '';
    applyBtn.style.display = 'none';
    modal.style.display = 'flex';
    return;
  }

  const imported = pendingMerge.state;
  const candidates = pendingMerge.candidates;
  const likely = candidates.filter(item => item.matches.some(match => isConfidentMergeMatch(item.person, match.person, match.score))).length;
  step.textContent = 'Етап 2: перевір можливі збіги людей.';
  summary.textContent = `Файл: ${pendingMerge.fileName}. Нових даних у ZIP: осіб ${Object.keys(imported.persons).length}, родин ${Object.keys(imported.families).length}, фото ${Object.keys(pendingMerge.photos).length}. Ймовірних збігів: ${likely}.`;
  list.innerHTML = candidates.map(item => {
    const p = item.person;
    const options = ['<option value="">Додати як нову особу</option>']
      .concat(item.matches.map(match => {
        const selected = isConfidentMergeMatch(p, match.person, match.score) ? 'selected' : '';
        const marker = selected ? 'підтверджений збіг' : 'перевірити вручну';
        const label = `${escapeHtml(composeDisplayName(match.person))} ${escapeHtml(formatYearsShort(match.person))} · ${marker} · ${match.score}`;
        return `<option value="${escapeHtml(match.person.id)}" ${selected}>${label}</option>`;
      }))
      .join('');
    const badge = item.matches.length ? `можливих збігів: ${item.matches.length}` : 'збігів не знайдено';
    return `
      <div style="padding:8px 6px; border-bottom:1px solid #e2e8f0;">
        <div style="font-weight:700">${escapeHtml(composeDisplayName(p)) || 'Без імені'} <span class="small">${escapeHtml(formatYearsShort(p))}</span></div>
        <div class="small">${escapeHtml(formatContextHint(p, imported))}</div>
        <div class="small" style="margin:3px 0 6px">${badge}</div>
        <select data-import-pid="${escapeHtml(p.id)}" style="width:100%; padding:8px; border:1px solid #e2e8f0; border-radius:8px;">${options}</select>
      </div>`;
  }).join('');
  list.style.display = 'block';
  applyBtn.style.display = 'block';
  modal.style.display = 'flex';
}

async function prepareMergeZip(e) {
  const file = e.target.files && e.target.files[0];
  if (!file) return;
  try {
    pendingMerge = null;
    renderMergeDialog();
    document.getElementById('mergeStepLine').textContent = 'Етап 1: читаю ZIP і готую порівняння…';
    const payload = await readProjectZipFile(file);
    pendingMerge = { ...payload, candidates: findMergeCandidates(payload.state, getMergeSourceKeys(payload)) };
    renderMergeDialog();
  } catch (err) {
    pendingMerge = null;
    alert('Не вдалося підготувати злиття ZIP: ' + (err && err.message ? err.message : err));
    closeMergeDialog();
  } finally {
    e.target.value = '';
  }
}

function closeMergeDialog() {
  document.getElementById('mergeModal').style.display = 'none';
}

function cloneImportedPhoto(photoId, importedPhotos, photoIdMap) {
  if (!photoId) return '';
  const source = importedPhotos[photoId];
  if (!source) return photoId;
  if (!photosState.photos[photoId]) {
    photosState.photos[photoId] = source;
    return photoId;
  }
  if (!photoIdMap[photoId]) {
    const nextId = uid('photo');
    photoIdMap[photoId] = nextId;
    photosState.photos[nextId] = source;
  }
  return photoIdMap[photoId];
}

function getSuspiciousBirthMarkers(importedState) {
  const yearCounts = {};
  const dateCounts = {};
  Object.values(importedState.persons || {}).forEach(person => {
    const year = extractYear(person.birth);
    const date = safeText(person.birth || '').toLowerCase().trim();
    if (year) yearCounts[year] = (yearCounts[year] || 0) + 1;
    if (date) dateCounts[date] = (dateCounts[date] || 0) + 1;
  });
  const total = Object.keys(importedState.persons || {}).length || 1;
  return {
    years: new Set(Object.entries(yearCounts)
    .filter(([, count]) => count >= 5 && count / total >= 0.08)
      .map(([year]) => year)),
    dates: new Set(Object.entries(dateCounts)
      .filter(([, count]) => count >= 3 && count / total >= 0.04)
      .map(([date]) => date))
  };
}

function shouldSkipImportedBirth(person, suspiciousBirthMarkers) {
  const year = extractYear(person?.birth);
  const date = safeText(person?.birth || '').toLowerCase().trim();
  return !!(
    suspiciousBirthMarkers &&
    ((year && suspiciousBirthMarkers.years.has(year)) || (date && suspiciousBirthMarkers.dates.has(date)))
  );
}

function sanitizeImportedPersonForMerge(person, suspiciousBirthMarkers) {
  const copy = { ...person };
  if (shouldSkipImportedBirth(copy, suspiciousBirthMarkers)) copy.birth = '';
  return copy;
}

function sameIdSet(a, b) {
  if (a.length !== b.length) return false;
  const set = new Set(a);
  return b.every(id => set.has(id));
}

function findExactFamily(adults, children, families) {
  return Object.values(families).find(f => {
    const existingAdults = (f.adults || []).slice().sort();
    const existingChildren = (f.children || []).map(ch => ch.personId).sort();
    return sameIdSet(existingAdults, adults.slice().sort()) && sameIdSet(existingChildren, children.slice().sort());
  }) || null;
}

function findParentFamilyInFamilies(families, pid) {
  return Object.values(families || {}).find(f => (f.children || []).some(ch => ch.personId === pid)) || null;
}

function findTopAncestorFamilyForFamily(families, startFid) {
  let currentId = startFid;
  const seen = new Set();
  while (currentId && families[currentId] && !seen.has(currentId)) {
    seen.add(currentId);
    const fam = families[currentId];
    const parentFam = (fam.adults || [])
      .map(pid => findParentFamilyInFamilies(families, pid))
      .find(parent => parent && parent.id !== currentId);
    if (!parentFam) break;
    currentId = parentFam.id;
  }
  return currentId || startFid;
}

function familyHasAnyAdult(fam, adultIds) {
  const set = new Set(adultIds || []);
  return !!(fam && (fam.adults || []).some(pid => set.has(pid)));
}

function isPlaceholderParentPerson(person, childPersons) {
  const first = safeText(person?.firstName || person?.name || '').trim();
  if (!/^(Батько|Мати)\s+/i.test(first)) return false;
  const tail = normalizeMatchText(first.replace(/^(Батько|Мати)\s+/i, ''));
  return childPersons.some(child => {
    const label = normalizeMatchText(composeDisplayName(child));
    return tail && label && (tail === label || tail.includes(label) || label.includes(tail));
  });
}

function familyHasOnlyPlaceholderAdults(fam, childIds, persons) {
  const adults = fam?.adults || [];
  if (!adults.length) return false;
  const childPersons = childIds.map(pid => persons[pid]).filter(Boolean);
  if (!childPersons.length) return false;
  return adults.every(pid => isPlaceholderParentPerson(persons[pid], childPersons));
}

function removePersonIfUnreferenced(persons, families, pid) {
  const used = Object.values(families || {}).some(fam => {
    return (fam.adults || []).includes(pid) || (fam.children || []).some(ch => ch.personId === pid);
  });
  if (!used) delete persons[pid];
}

function hasDescendantInFamilies(families, startPid, targetPid) {
  if (!startPid || !targetPid) return false;
  if (startPid === targetPid) return true;
  const familyList = Object.values(families || {});
  const stack = [startPid];
  const seenPersons = new Set();
  while (stack.length) {
    const pid = stack.pop();
    if (!pid || seenPersons.has(pid)) continue;
    seenPersons.add(pid);
    for (const fam of familyList) {
      if (!(fam.adults || []).includes(pid)) continue;
      for (const child of (fam.children || [])) {
      if (child.personId === targetPid) return true;
        if (child.personId && !seenPersons.has(child.personId)) stack.push(child.personId);
      }
    }
  }
  return false;
}

function wouldCreateFamilyCycle(families, adults, childIds) {
  return adults.some(adultId => childIds.some(childId => {
    return adultId === childId || hasDescendantInFamilies(families, childId, adultId);
  }));
}

function removeCyclicAdultLinks(families) {
  const cleaned = deepClone(families || {});
  for (const fam of Object.values(cleaned)) {
    const childIds = (fam.children || []).map(ch => ch.personId).filter(Boolean);
    fam.adults = (fam.adults || []).filter(adultId => {
      const snapshot = deepClone(cleaned);
      if (snapshot[fam.id]) snapshot[fam.id].adults = (snapshot[fam.id].adults || []).filter(pid => pid !== adultId);
      return !wouldCreateFamilyCycle(snapshot, [adultId], childIds);
    });
  }
  return cleaned;
}

function mergePersonFields(target, source, importedPhotos, photoIdMap) {
  ['firstName','lastName','maidenName','birth','death','deathStatus','note'].forEach(key => {
    if (!safeText(target[key] || '').trim() && safeText(source[key] || '').trim()) target[key] = source[key];
  });
  if ((!target.gender || target.gender === 'unknown') && source.gender) target.gender = source.gender;
  if (!target.photoId && source.photoId) target.photoId = cloneImportedPhoto(source.photoId, importedPhotos, photoIdMap);
}

async function applyTreeMerge() {
  if (!pendingMerge) return;
  const selects = Array.from(document.querySelectorAll('#mergeMatches select[data-import-pid]'));
  const chosen = new Map(selects.map(sel => [sel.dataset.importPid, sel.value || '']));
  pendingMerge.proposedMap = new Map(Array.from(chosen.entries()).filter(([, targetId]) => !!targetId));
  const ok = confirm('Етап 3: підтвердити злиття? Поточне дерево не буде очищене; перед зміною створиться внутрішня резервна копія.');
  if (!ok) return;

  try {
    await saveAutoBackup('before-merge');
    const imported = pendingMerge.state;
    const importedPhotos = pendingMerge.photos || {};
    const sourceKeys = getMergeSourceKeys(pendingMerge);
    const suspiciousBirthMarkers = getSuspiciousBirthMarkers(imported);
    const photoIdMap = {};
    const next = deepClone(state);
    const previousHomeId = next.homeId;
    const personIdMap = {};
    let matched = 0, addedPersons = 0, addedFamilies = 0, updatedFamilies = 0, replacedPlaceholders = 0, addedPhotosBefore = Object.keys(photosState.photos || {}).length;

    for (const [importId, person] of Object.entries(imported.persons || {})) {
      const mergePerson = sanitizeImportedPersonForMerge(person, suspiciousBirthMarkers);
      const importKeys = makeImportKeys(sourceKeys, importId);
      let targetId = chosen.get(importId);
      const knownPerson = findRecordByImportKeys(next.persons, importKeys);
      if (knownPerson) targetId = knownPerson.id;
      if (!targetId && next.persons[importId]) {
        const sameIdScore = personMatchScore(mergePerson, next.persons[importId], imported, next);
        if (sameIdScore >= 10 && isConfidentMergeMatch(mergePerson, next.persons[importId], sameIdScore, imported)) {
          targetId = importId;
        }
      }
      if (!targetId) {
        const repeatMatch = findRepeatImportMatch(mergePerson, imported, next);
        if (repeatMatch) targetId = repeatMatch.id;
      }
      if (!targetId) {
        const contextual = Object.values(next.persons || {})
          .map(existing => ({ person: existing, score: personMatchScore(mergePerson, existing, imported, next) }))
          .filter(match => match.score >= 10 && isConfidentMergeMatch(mergePerson, match.person, match.score, imported))
          .sort((a, b) => b.score - a.score)[0];
        if (contextual) targetId = contextual.person.id;
      }
      if (targetId && next.persons[targetId]) {
        personIdMap[importId] = targetId;
        pendingMerge.proposedMap.set(importId, targetId);
        mergePersonFields(next.persons[targetId], mergePerson, importedPhotos, photoIdMap);
        addImportKeys(next.persons[targetId], importKeys);
        matched++;
      } else {
        const newId = next.persons[importId] ? uid('p') : importId;
        personIdMap[importId] = newId;
        const copy = buildPersonRecord(newId, mergePerson);
        addImportKeys(copy, importKeys);
        if (copy.photoId) copy.photoId = cloneImportedPhoto(copy.photoId, importedPhotos, photoIdMap);
        next.persons[newId] = copy;
        addedPersons++;
      }
    }

    for (const [importFid, fam] of Object.entries(imported.families || {})) {
      const familyImportKeys = makeImportKeys(sourceKeys, importFid);
      const knownFamily = findRecordByImportKeys(next.families, familyImportKeys);
      if (knownFamily) continue;
      const adults = (fam.adults || []).map(pid => personIdMap[pid]).filter(Boolean);
      const children = (fam.children || []).map(ch => ({ personId: personIdMap[ch.personId] })).filter(ch => ch.personId);
      if (!adults.length && !children.length) continue;
      const childIds = children.map(ch => ch.personId);
      const safeAdults = adults.filter(adultId => !wouldCreateFamilyCycle(next.families, [adultId], childIds));
      if (!safeAdults.length && adults.length) continue;
      const exactFamily = findExactFamily(safeAdults, childIds, next.families);
      if (exactFamily) {
        addImportKeys(exactFamily, familyImportKeys);
        continue;
      }
      const existingParent = children.map(ch => findParentFamilyInFamilies(next.families, ch.personId)).find(Boolean);
      if (existingParent) {
        if (safeAdults.length && familyHasOnlyPlaceholderAdults(existingParent, childIds, next.persons)) {
          const oldAdults = (existingParent.adults || []).slice();
          existingParent.adults = Array.from(new Set(safeAdults));
          addImportKeys(existingParent, familyImportKeys);
          oldAdults.forEach(pid => removePersonIfUnreferenced(next.persons, next.families, pid));
          replacedPlaceholders++;
          updatedFamilies++;
          continue;
        }
        const canMergeIntoExisting = !(existingParent.adults || []).length || familyHasAnyAdult(existingParent, safeAdults);
        if (!canMergeIntoExisting) continue;
        let changedExisting = false;
        safeAdults.forEach(pid => {
          if (!existingParent.adults.includes(pid)) {
            existingParent.adults.push(pid);
            changedExisting = true;
          }
        });
        addImportKeys(existingParent, familyImportKeys);
        if (changedExisting) updatedFamilies++;
        continue;
      }
      const unattachedChildren = children.filter(ch => !findParentFamilyInFamilies(next.families, ch.personId));
      if (children.length && !unattachedChildren.length) continue;
      const newFid = next.families[importFid] ? uid('f') : importFid;
      next.families[newFid] = { id: newFid, adults: Array.from(new Set(safeAdults)), children: unattachedChildren, importKeys: familyImportKeys };
      addedFamilies++;
    }

    next.families = removeCyclicAdultLinks(next.families);
    if (previousHomeId && next.families[previousHomeId]) {
      next.homeId = findTopAncestorFamilyForFamily(next.families, previousHomeId);
    } else if (!next.homeId || !next.families[next.homeId]) {
      next.homeId = chooseBestHomeFamily(next.families);
    }
    photosState = normalizePhotosState(photosState);
    localStorage.setItem(PHOTOS_STORAGE_KEY, JSON.stringify(photosState));
    commitState(next, { markDirty: true, linkedJsonName: '', statusText: `Злиття завершено: +${addedPersons} осіб, +${addedFamilies} родин` });
    await restorePhotoCacheFromState();
    hydrateVisiblePhotos();
    setTimeout(resetView, 50);
    pendingMerge = null;
    closeMergeDialog();
    alert(`Злиття завершено.\nЗіставлено осіб: ${matched}\nДодано осіб: ${addedPersons}\nДодано родин: ${addedFamilies}\nОновлено родин: ${updatedFamilies}\nЗамінено заглушкових батьків: ${replacedPlaceholders}\nДодано фото: ${Object.keys(photosState.photos || {}).length - addedPhotosBefore}`);
  } catch (err) {
    updateSaveBadge('err', 'Помилка злиття');
    alert('Не вдалося об’єднати дерева: ' + (err && err.message ? err.message : err));
  }
}

// --- GEDCOM ---
function exportGEDCOM() {
  try {
    const ged = generateGEDCOM(state);
    const base = suggestedJsonFilename().replace(/\.json$/i, '');
    downloadText(base + '.ged', ged, 'text/plain');
    withDraft(draft => {
      draft.meta.dirty = false;
      draft.meta.lastExportAt = new Date().toISOString();
    }, 'GEDCOM експортовано');
  } catch (err) {
    updateSaveBadge('err', 'Помилка GEDCOM');
    alert('Не вдалося експортувати GEDCOM: ' + err.message);
  }
}

async function importGEDCOM(e) {
  const file = e.target.files[0];
  if (!file) return;
  const shouldContinue = await confirmReplaceBrowserTree('імпортувати GEDCOM');
  if (!shouldContinue) {
    e.target.value = '';
    return;
  }
  const reader = new FileReader();
  reader.onload = ev => {
    try {
      const imported = parseGEDCOM(ev.target.result);
      commitState(imported, { markDirty: true, linkedJsonName: '', statusText: 'GEDCOM імпортовано' });
      resetView();
    } catch (err) {
      updateSaveBadge('err', 'GEDCOM пошкоджений');
      alert('Не вдалося імпортувати GEDCOM: ' + err.message);
    }
  };
  reader.readAsText(file, 'utf-8');
  e.target.value = '';
}

function generateGEDCOM(current) {
  const lines = [
    '0 HEAD',
    '1 SOUR BrowserFamilyTree',
    '1 GEDC',
    '2 VERS 5.5.1',
    '1 CHAR UTF-8'
  ];

  const personIds = Object.keys(current.persons).sort();
  for (const pid of personIds) {
    const p = current.persons[pid];
    lines.push(`0 @${pid}@ INDI`);
    lines.push(`1 NAME ${escapeGedcomText(composeDisplayName(p) || p.firstName || p.name || 'Без імені')}`);
    lines.push(`1 SEX ${p.gender === 'male' ? 'M' : p.gender === 'female' ? 'F' : 'U'}`);
    if (p.birth) {
      lines.push('1 BIRT');
      lines.push(`2 DATE ${escapeGedcomText(p.birth)}`);
    }
    if (p.death || p.deathStatus) {
      lines.push('1 DEAT');
      if (p.death) lines.push(`2 DATE ${escapeGedcomText(p.death)}`);
      if (p.deathStatus) lines.push(`2 NOTE ${escapeGedcomText(p.deathStatus)}`);
    }
  }

  const familyIds = Object.keys(current.families).sort();
  for (const fid of familyIds) {
    const f = current.families[fid];
    lines.push(`0 @${fid}@ FAM`);
    const adults = f.adults || [];
    const males = adults.filter(pid => current.persons[pid]?.gender === 'male');
    const females = adults.filter(pid => current.persons[pid]?.gender === 'female');
    const used = new Set();
    if (males[0]) { lines.push(`1 HUSB @${males[0]}@`); used.add(males[0]); }
    if (females[0]) { lines.push(`1 WIFE @${females[0]}@`); used.add(females[0]); }
    adults.filter(pid => !used.has(pid)).forEach(pid => lines.push(`1 ASSO @${pid}@`));
    (f.children || []).forEach(ch => lines.push(`1 CHIL @${ch.personId}@`));
  }

  lines.push('0 TRLR');
  return lines.join('\n');
}

function chooseBestHomeFamily(families) {
  const allFamilies = Object.values(families || {});
  if (!allFamilies.length) return '';

  const childToParentFamily = new Map();
  for (const fam of allFamilies) {
    (fam.children || []).forEach(ch => {
      if (ch && ch.personId && !childToParentFamily.has(ch.personId)) childToParentFamily.set(ch.personId, fam.id);
    });
  }

  const roots = allFamilies.filter(f => !(f.adults || []).some(pid => childToParentFamily.has(pid)));
  const pool = roots.length ? roots : allFamilies;
  const familyByAdult = new Map();
  for (const fam of allFamilies) {
    (fam.adults || []).forEach(pid => { if (!familyByAdult.has(pid)) familyByAdult.set(pid, fam.id); });
  }

  const memo = new Map();
  function scoreFamily(fid, seen = new Set()) {
    if (!fid || seen.has(fid)) return 0;
    if (memo.has(fid)) return memo.get(fid);
    const fam = families[fid];
    if (!fam) return 0;
    seen.add(fid);
    let score = (fam.adults || []).length + ((fam.children || []).length * 2);
    for (const ch of (fam.children || [])) {
      const subId = familyByAdult.get(ch.personId);
      if (subId) score += scoreFamily(subId, new Set(seen));
    }
    memo.set(fid, score);
    return score;
  }

  pool.sort((a, b) => scoreFamily(b.id) - scoreFamily(a.id));
  return pool[0]?.id || allFamilies[0]?.id || '';
}

function parseGedcomName(rawValue) {
  const raw = safeText(rawValue).replace(/\s+/g, ' ').trim();
  const maidenMatch = raw.match(/\(([^)]+)\)\s*$/);
  const maidenName = maidenMatch ? safeNamePart(maidenMatch[1]) : '';
  const withoutMaiden = maidenMatch ? raw.slice(0, maidenMatch.index).trim() : raw;
  const slashMatch = withoutMaiden.match(/^(.*?)\/([^/]+)\/(.*)$/);
  if (slashMatch) {
    const firstName = safeNamePart((slashMatch[1] + ' ' + slashMatch[3]).trim());
    const lastName = safeNamePart(slashMatch[2]);
    return {
      firstName: firstName || 'Без імені',
      lastName,
      maidenName,
      name: firstName || 'Без імені'
    };
  }
  const clean = withoutMaiden.replace(/\//g, '').trim();
  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length > 1) {
    return {
      firstName: safeNamePart(parts.slice(0, -1).join(' ')) || 'Без імені',
      lastName: safeNamePart(parts[parts.length - 1]),
      maidenName,
      name: safeNamePart(parts.slice(0, -1).join(' ')) || 'Без імені'
    };
  }
  return {
    firstName: safeNamePart(clean) || 'Без імені',
    lastName: '',
    maidenName,
    name: safeNamePart(clean) || 'Без імені'
  };
}

function normalizeGedcomDate(rawValue) {
  const text = safeText(rawValue).replace(/\s+/g, ' ').trim();
  if (!text) return '';
  const months = {
    JAN: '01', FEB: '02', MAR: '03', APR: '04', MAY: '05', JUN: '06',
    JUL: '07', AUG: '08', SEP: '09', OCT: '10', NOV: '11', DEC: '12'
  };
  const qualifiers = {
    ABT: 'бл.', ABOUT: 'бл.', BEF: 'до', BEFORE: 'до', AFT: 'після', AFTER: 'після',
    EST: 'прибл.', CAL: 'обч.'
  };
  const parts = text.toUpperCase().split(' ');
  let prefix = '';
  if (qualifiers[parts[0]]) prefix = qualifiers[parts.shift()];
  const dayMonthYear = parts.join(' ').match(/^(\d{1,2})\s+([A-Z]{3})\s+(\d{3,4})$/);
  const monthYear = parts.join(' ').match(/^([A-Z]{3})\s+(\d{3,4})$/);
  const yearOnly = parts.join(' ').match(/^(\d{3,4})$/);
  let value = text;
  if (dayMonthYear && months[dayMonthYear[2]]) {
    value = `${dayMonthYear[1].padStart(2, '0')}.${months[dayMonthYear[2]]}.${dayMonthYear[3]}`;
  } else if (monthYear && months[monthYear[1]]) {
    value = `${months[monthYear[1]]}.${monthYear[2]}`;
  } else if (yearOnly) {
    value = yearOnly[1];
  }
  return prefix ? `${prefix} ${value}` : value;
}

function parseGEDCOM(text) {
  const individuals = {};
  const families = {};
  const famcByPerson = new Map();
  const famsByPerson = new Map();
  let current = null;
  let currentType = '';
  let currentEvent = '';

  const lines = String(text).replace(/\r/g, '').split('\n');
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    let m = line.match(/^(\d+)\s+@([^@]+)@\s+(INDI|FAM)$/);
    if (m) {
      const [, level, id, type] = m;
      if (level !== '0') continue;
      currentType = type;
      current = id;
      currentEvent = '';
      if (type === 'INDI') individuals[id] = individuals[id] || { id, name: 'Без імені', gender: 'unknown' };
      else families[id] = families[id] || { id, adults: [], children: [] };
      continue;
    }
    if (!current) continue;

    if (currentType === 'INDI') {
      let n = line.match(/^1\s+NAME\s+(.+)$/);
      if (n) { Object.assign(individuals[current], parseGedcomName(n[1])); currentEvent = ''; continue; }
      let givn = line.match(/^2\s+GIVN\s+(.+)$/);
      if (givn) { individuals[current].firstName = safeNamePart(givn[1]) || individuals[current].firstName || 'Без імені'; individuals[current].name = individuals[current].firstName; continue; }
      let surn = line.match(/^2\s+SURN\s+(.+)$/);
      if (surn) { individuals[current].lastName = safeNamePart(surn[1]); continue; }
      let maiden = line.match(/^2\s+(_MARNM|_MARNM|_MARNM|_AKA|AKA)\s+(.+)$/);
      if (maiden && !individuals[current].maidenName) { individuals[current].maidenName = safeNamePart(maiden[2].replace(/\//g, '')); continue; }
      let s = line.match(/^1\s+SEX\s+([MFU])$/);
      if (s) { individuals[current].gender = normalizeGender(s[1]); currentEvent = ''; continue; }
      let event = line.match(/^1\s+(BIRT|DEAT)\b/);
      if (event) { currentEvent = event[1]; continue; }
      let date = line.match(/^2\s+DATE\s+(.+)$/);
      if (date && currentEvent === 'BIRT') { individuals[current].birth = normalizeGedcomDate(date[1]); continue; }
      if (date && currentEvent === 'DEAT') { individuals[current].death = normalizeGedcomDate(date[1]); continue; }
      let deathNote = line.match(/^2\s+NOTE\s+(.+)$/);
      if (deathNote && currentEvent === 'DEAT') { individuals[current].deathStatus = safeNamePart(deathNote[1]); continue; }
      let famc = line.match(/^1\s+FAMC\s+@([^@]+)@$/);
      if (famc) { famcByPerson.set(current, famc[1]); currentEvent = ''; continue; }
      let fams = line.match(/^1\s+FAMS\s+@([^@]+)@$/);
      if (fams) {
        if (!famsByPerson.has(current)) famsByPerson.set(current, []);
        famsByPerson.get(current).push(fams[1]);
        currentEvent = '';
        continue;
      }
    }

    if (currentType === 'FAM') {
      let a = line.match(/^1\s+(HUSB|WIFE|ASSO)\s+@([^@]+)@$/);
      if (a) {
        if (!families[current].adults.includes(a[2])) families[current].adults.push(a[2]);
        continue;
      }
      let c = line.match(/^1\s+CHIL\s+@([^@]+)@$/);
      if (c) {
        if (!families[current].children.some(ch => ch.personId === c[1])) families[current].children.push({ personId: c[1] });
        continue;
      }
    }
  }

  for (const [pid, fid] of famcByPerson.entries()) {
    if (!families[fid]) families[fid] = { id: fid, adults: [], children: [] };
    if (!families[fid].children.some(ch => ch.personId === pid)) families[fid].children.push({ personId: pid });
  }
  for (const [pid, fids] of famsByPerson.entries()) {
    for (const fid of fids) {
      if (!families[fid]) families[fid] = { id: fid, adults: [], children: [] };
      if (!families[fid].adults.includes(pid)) families[fid].adults.push(pid);
    }
  }

  const imported = {
    meta: { version: APP_VERSION, projectName: 'GEDCOM import', linkedJsonName: '', dirty: true },
    persons: individuals,
    families,
    homeId: chooseBestHomeFamily(families)
  };
  return normalizeState(imported);
}

function escapeGedcomText(text) {
  return String(text || '').replace(/[\r\n]+/g, ' ').trim();
}

/* TRUSTED_APP_END */
window.addEventListener('resize', () => requestDrawConnectors());
if (window.visualViewport) {
  visualViewport.addEventListener('resize', () => requestDrawConnectors());
  visualViewport.addEventListener('scroll', () => requestDrawConnectors());
}
window.addEventListener('load', async () => {
  await verifyOriginalBuild();
  await restorePhotoCacheFromState();
  render();
  requestAnimationFrame(() => requestAnimationFrame(() => {
    fitTreeInView();
    drawConnectors();
  }));
  hydrateVisiblePhotos();
  await offerAutoBackupRestore();
  if (!state.homeId) updateSaveBadge('ok', "Локальний режим активний");
  else updateSaveBadge('ok', "Локальний проєкт активний");
});

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') saveAutoBackup('visibilitychange');
});
window.addEventListener('pagehide', () => { saveAutoBackup('pagehide'); });
