import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { create, getNumericDate } from "https://deno.land/x/djwt@v3.0.1/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Hàm tạo Access Token từ Service Account Credentials
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

  // Import key
  const privateKey = await crypto.subtle.importKey(
    "pkcs8",
    binaryDer,
    {
      name: "RSASSA-PKCS1-v1_5",
      hash: "SHA-256",
    },
    false,
    ["sign"]
  );

  const payload = {
    iss: clientEmail,
    scope: "https://www.googleapis.com/auth/drive",  // Full drive access to write to shared folders
    aud: "https://oauth2.googleapis.com/token",
    exp: getNumericDate(3600), // Hết hạn sau 1 giờ
    iat: getNumericDate(0),
  };

  const jwt = await create({ alg: "RS256", typ: "JWT" }, payload, privateKey);

  // Đổi JWT lấy Access Token
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
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

serve(async (req) => {
  // Xử lý CORS cho preflight request
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const credentialsStr = Deno.env.get("GCP_CREDENTIALS");
    if (!credentialsStr) {
      throw new Error("GCP_CREDENTIALS secret is not configured on Supabase");
    }

    let credentials: { client_email: string; private_key: string };
    try {
      credentials = JSON.parse(credentialsStr);
    } catch (e) {
      throw new Error(`GCP_CREDENTIALS is not valid JSON: ${(e as Error).message}`);
    }
    if (!credentials.client_email || !credentials.private_key) {
      throw new Error("GCP_CREDENTIALS missing client_email or private_key");
    }
    const clientEmail = credentials.client_email;
    const privateKey = credentials.private_key;

    // 2. Nhận file từ Request (Form Data)
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const folderId = formData.get("folderId") || "1JeYf62I-cfJPqEFhnq8v1ow4VavYhhNx"; // ID mặc định từ user

    if (!file) {
      return new Response(JSON.stringify({ error: "No file uploaded" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 3. Lấy Access Token
    const accessToken = await getGoogleAccessToken(clientEmail, privateKey);

    // 4. Upload file lên Google Drive (sử dụng Multipart Upload)
    const metadata = {
      name: file.name,
      parents: [folderId],
    };

    const boundary = "-------314159265358979323846";
    const delimiter = `\r\n--${boundary}\r\n`;
    const closeDelimiter = `\r\n--${boundary}--`;

    const fileBuffer = await file.arrayBuffer();

    let multipartRequestBody = "";
    multipartRequestBody += delimiter;
    multipartRequestBody += 'Content-Type: application/json\r\n\r\n';
    multipartRequestBody += JSON.stringify(metadata);
    multipartRequestBody += delimiter;
    multipartRequestBody += `Content-Type: ${file.type || 'application/octet-stream'}\r\n\r\n`;

    // Chúng ta phải gộp string metadata và binary file lại với nhau
    const enc = new TextEncoder();
    const part1 = enc.encode(multipartRequestBody);
    const part2 = new Uint8Array(fileBuffer);
    const part3 = enc.encode(closeDelimiter);
    
    const bodyLength = part1.length + part2.length + part3.length;
    const requestBody = new Uint8Array(bodyLength);
    requestBody.set(part1, 0);
    requestBody.set(part2, part1.length);
    requestBody.set(part3, part1.length + part2.length);

    const uploadResponse = await fetch(
      "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&supportsAllDrives=true",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": `multipart/related; boundary=${boundary}`,
        },
        body: requestBody,
      }
    );

    const uploadResult = await uploadResponse.json();
    if (!uploadResponse.ok) {
      throw new Error(`Google Drive Upload Error: ${JSON.stringify(uploadResult)}`);
    }

    // 5. Trả về thông tin file đã upload
    // Trả về fileId. Ghi chú: File được tạo bởi Service Account.
    // Vì Service Account đã được cấp quyền Editor vào thư mục của bạn, file sẽ nằm trong thư mục đó.
    // Lấy link webViewLink
    const fileId = uploadResult.id;
    
    // Gọi API để lấy link (nếu cần thiết lập quyền đọc)
    // Tùy chọn: thiết lập quyền đọc cho mọi người (nếu muốn)
    await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}/permissions`, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            role: 'reader',
            type: 'anyone'
        })
    });

    const fileMetaResponse = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?fields=webViewLink,webContentLink`, {
        headers: {
            Authorization: `Bearer ${accessToken}`,
        }
    });
    const fileMetaData = await fileMetaResponse.json();

    return new Response(
      JSON.stringify({
        success: true,
        file: {
          id: fileId,
          name: file.name,
          size: file.size,
          webViewLink: fileMetaData.webViewLink,
          webContentLink: fileMetaData.webContentLink,
        },
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
