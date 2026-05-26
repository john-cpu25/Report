import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { create, getNumericDate } from "https://deno.land/x/djwt@v3.0.1/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function getGoogleAccessToken(clientEmail: string, privateKeyPem: string) {
  const pemHeader = "-----BEGIN PRIVATE KEY-----";
  const pemFooter = "-----END PRIVATE KEY-----";

  // Normalize: handle both literal \n (from JSON serialization issues) and real newlines
  const normalizedKey = privateKeyPem.replace(/\\n/g, "\n").trim();

  if (!normalizedKey.includes(pemHeader)) {
    throw new Error(`Invalid Private Key format. Key starts with: ${normalizedKey.substring(0, 50)}`);
  }

  const pemContents = normalizedKey
    .substring(
      normalizedKey.indexOf(pemHeader) + pemHeader.length,
      normalizedKey.indexOf(pemFooter)
    )
    .replace(/[\r\n\s]/g, "");

  if (!pemContents || pemContents.length < 100) {
    throw new Error(`PEM content extraction failed. Content length: ${pemContents.length}`);
  }

  let binaryDerString: string;
  try {
    binaryDerString = atob(pemContents);
  } catch (e) {
    throw new Error(`Failed to decode base64 PEM. Length=${pemContents.length}, starts=${pemContents.substring(0, 20)}`);
  }
  const binaryDer = new Uint8Array(binaryDerString.length);
  for (let i = 0; i < binaryDerString.length; i++) {
    binaryDer[i] = binaryDerString.charCodeAt(i);
  }

  const privateKey = await crypto.subtle.importKey(
    "pkcs8",
    binaryDer,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const payload = {
    iss: clientEmail,
    scope: "https://www.googleapis.com/auth/drive",  // Full drive access
    aud: "https://oauth2.googleapis.com/token",
    exp: getNumericDate(3600),
    iat: getNumericDate(0),
  };

  const jwt = await create({ alg: "RS256", typ: "JWT" }, payload, privateKey);

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(`Failed to get Google access token: ${JSON.stringify(data)}`);
  }
  return data.access_token;
}

// Helper: Lấy hoặc tạo thư mục trên Drive
async function getOrCreateFolder(accessToken: string, folderName: string, parentId: string) {
  const query = `mimeType='application/vnd.google-apps.folder' and name='${folderName}' and '${parentId}' in parents and trashed=false`;
  const searchRes = await fetch(`https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name)&supportsAllDrives=true&includeItemsFromAllDrives=true`, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  const searchData = await searchRes.json();

  if (!searchRes.ok) throw new Error(JSON.stringify(searchData));

  if (searchData.files && searchData.files.length > 0) {
    return searchData.files[0].id;
  }

  // Tạo mới
  const createRes = await fetch('https://www.googleapis.com/drive/v3/files?supportsAllDrives=true', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [parentId]
    })
  });
  const createData = await createRes.json();
  if (!createRes.ok) throw new Error(JSON.stringify(createData));

  return createData.id;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { rootFolderId, projectKey, issueDate } = await req.json();

    if (!rootFolderId || !projectKey || !issueDate) {
      throw new Error("Missing parameters: rootFolderId, projectKey, or issueDate");
    }

    const credentialsStr = Deno.env.get("GCP_CREDENTIALS");
    if (!credentialsStr) throw new Error("GCP_CREDENTIALS secret is not configured on Supabase");

    let credentials: { client_email: string; private_key: string };
    try {
      credentials = JSON.parse(credentialsStr);
    } catch (e) {
      throw new Error(`GCP_CREDENTIALS is not valid JSON: ${(e as Error).message}`);
    }
    if (!credentials.client_email || !credentials.private_key) {
      throw new Error("GCP_CREDENTIALS missing client_email or private_key");
    }

    const accessToken = await getGoogleAccessToken(credentials.client_email, credentials.private_key);

    // 1. Lấy/Tạo thư mục "Project"
    const projectRootId = await getOrCreateFolder(accessToken, "Project", rootFolderId);
    // 2. Lấy/Tạo thư mục "[Mã Dự Án]"
    const projectId = await getOrCreateFolder(accessToken, projectKey, projectRootId);
    // 3. Lấy/Tạo thư mục "Issue"
    const issueRootId = await getOrCreateFolder(accessToken, "Issue", projectId);
    // 4. Lấy/Tạo thư mục "[Ngày Issue]"
    const targetFolderId = await getOrCreateFolder(accessToken, issueDate, issueRootId);

    return new Response(
      JSON.stringify({
        success: true,
        folderId: targetFolderId,
        path: `Project/${projectKey}/Issue/${issueDate}`
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
