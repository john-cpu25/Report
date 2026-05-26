/**
 * useGoogleDrive.js
 * Custom hook to handle Google OAuth token + Drive API operations
 * directly from the browser — no Edge Function needed.
 *
 * SETUP: Replace GOOGLE_CLIENT_ID with your OAuth 2.0 Client ID from
 * https://console.cloud.google.com/apis/credentials
 */

// ⚠️ PASTE YOUR OAUTH CLIENT ID HERE:
const GOOGLE_CLIENT_ID = '427732687091-ogqtr6ir1e8skrdbc22ubrrq0vkf5vpq.apps.googleusercontent.com';

const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.file';
const TOKEN_STORAGE_KEY = 'gapi_access_token';
const TOKEN_EXPIRY_KEY  = 'gapi_token_expiry';

/** Get cached token if still valid (5-min buffer) */
function getCachedToken() {
  const token  = sessionStorage.getItem(TOKEN_STORAGE_KEY);
  const expiry = Number(sessionStorage.getItem(TOKEN_EXPIRY_KEY) || 0);
  if (token && Date.now() < expiry - 5 * 60 * 1000) return token;
  return null;
}

/** Request a fresh Google OAuth access token via popup */
function requestNewToken() {
  return new Promise((resolve, reject) => {
    if (!window.google?.accounts?.oauth2) {
      return reject(new Error('Google Identity Services chưa load xong. Thử lại sau vài giây.'));
    }
    const client = window.google.accounts.oauth2.initTokenClient({
      client_id: GOOGLE_CLIENT_ID,
      scope: DRIVE_SCOPE,
      callback: (response) => {
        if (response.error) return reject(new Error(response.error));
        const expiresIn = (response.expires_in || 3600) * 1000;
        sessionStorage.setItem(TOKEN_STORAGE_KEY, response.access_token);
        sessionStorage.setItem(TOKEN_EXPIRY_KEY, String(Date.now() + expiresIn));
        resolve(response.access_token);
      },
    });
    client.requestAccessToken({ prompt: '' }); // '' = only show popup if needed
  });
}

/** Get token: use cache or request new */
async function getGoogleToken() {
  return getCachedToken() || (await requestNewToken());
}

/** Create or find a folder in Google Drive */
async function getOrCreateFolder(token, folderName, parentId) {
  const q = `mimeType='application/vnd.google-apps.folder' and name='${folderName}' and '${parentId}' in parents and trashed=false`;
  const searchRes = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id,name)`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const searchData = await searchRes.json();
  if (!searchRes.ok) throw new Error(`Drive search error: ${JSON.stringify(searchData)}`);
  if (searchData.files?.length > 0) return searchData.files[0].id;

  // Create new folder
  const createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [parentId],
    }),
  });
  const createData = await createRes.json();
  if (!createRes.ok) throw new Error(`Drive create folder error: ${JSON.stringify(createData)}`);
  return createData.id;
}

/**
 * Build the folder path and return subfolder IDs for PDF and DWG.
 * Structure: ROOT / Project / [projectKey] / Issue / [date] / PDF
 *                                                            / DWG
 */
async function ensureIssueFolderPath(token, rootFolderId, projectKey) {
  const today   = new Date();
  const yy      = String(today.getFullYear()).slice(2);
  const mm      = String(today.getMonth() + 1).padStart(2, '0');
  const dd      = String(today.getDate()).padStart(2, '0');
  const dateStr = `${yy}.${mm}.${dd}`;

  const projectRoot = await getOrCreateFolder(token, 'Project',   rootFolderId);
  const projectDir  = await getOrCreateFolder(token, projectKey,  projectRoot);
  const issueRoot   = await getOrCreateFolder(token, 'Issue',     projectDir);
  const dateDir     = await getOrCreateFolder(token, dateStr,     issueRoot);

  // Create PDF and DWG subfolders
  const [pdfFolderId, dwgFolderId] = await Promise.all([
    getOrCreateFolder(token, 'PDF', dateDir),
    getOrCreateFolder(token, 'DWG', dateDir),
  ]);

  return { pdfFolderId, dwgFolderId };
}

/** Determine folder based on file extension */
function getFolderForFile(fileName, pdfFolderId, dwgFolderId) {
  const ext = fileName.split('.').pop()?.toLowerCase();
  if (ext === 'dwg' || ext === 'dxf') return dwgFolderId;
  return pdfFolderId; // PDF and everything else → PDF folder
}

/**
 * Upload a single file to Google Drive.
 * Returns { id, name, size, webViewLink, webContentLink }
 */
async function uploadFileToDrive(token, file, folderId) {
  const metadata = { name: file.name, parents: [folderId] };
  const form     = new FormData();
  form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
  form.append('file', file);

  const uploadRes = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,size,webViewLink,webContentLink',
    { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: form }
  );
  const uploadData = await uploadRes.json();
  if (!uploadRes.ok) throw new Error(`Upload error: ${JSON.stringify(uploadData)}`);

  // Make file publicly readable (anyone with link can download)
  await fetch(`https://www.googleapis.com/drive/v3/files/${uploadData.id}/permissions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ role: 'reader', type: 'anyone' }),
  });

  // Fetch updated links
  const metaRes  = await fetch(
    `https://www.googleapis.com/drive/v3/files/${uploadData.id}?fields=id,name,size,webViewLink,webContentLink`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return await metaRes.json();
}

// ─── Exported Hook ────────────────────────────────────────────────────────────
import { useCallback } from 'react';

export function useGoogleDrive() {
  /**
   * Main entry point: authenticate → create folders → upload files
   * @param {File[]} files
   * @param {string} rootFolderId  - ID of the root Google Drive folder
   * @param {string} projectKey    - e.g. "11092"
   * @param {(result: object) => void} onFileUploaded - called after each file
   */
  const uploadFiles = useCallback(async (files, rootFolderId, projectKey, onFileUploaded) => {
    // 1. Get OAuth token (will open popup if needed)
    const token = await getGoogleToken();

    // 2. Ensure folder path exists → get { pdfFolderId, dwgFolderId }
    const { pdfFolderId, dwgFolderId } = await ensureIssueFolderPath(token, rootFolderId, projectKey);

    // 3. Upload each file to the correct subfolder
    const results = [];
    for (let i = 0; i < files.length; i++) {
      const file     = files[i];
      const folderId = getFolderForFile(file.name, pdfFolderId, dwgFolderId);
      const result   = await uploadFileToDrive(token, file, folderId);
      results.push(result);
      if (onFileUploaded) onFileUploaded(result, i);
    }
    return results;
  }, []);

  return { uploadFiles };
}
