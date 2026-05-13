const crypto = require("crypto");

const R2_ENDPOINT = "https://5152ba61567f02cdbb439af3630b10b4.r2.cloudflarestorage.com";
const R2_BUCKET   = "beatcave-audio";
const R2_ACCESS   = "8880ad678671b9e138a38986ea03a50e";
const R2_SECRET   = "0b17e135a1b61c007da4a4205f37474af5da7c58790f6db861dfb9b56385be74";

function hmac(key, data) {
  return crypto.createHmac("sha256", key).update(data).digest();
}

function sha256hex(data) {
  return crypto.createHash("sha256").update(typeof data === "string" ? data : Buffer.from(data)).digest("hex");
}

exports.handler = async (event) => {
  const cors = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };

  if (event.httpMethod === "OPTIONS") return { statusCode: 200, headers: cors, body: "" };

  try {
    const { path, contentType, fileBase64 } = JSON.parse(event.body || "{}");
    if (!path) return { statusCode: 400, headers: cors, body: JSON.stringify({ error: "path mancante" }) };

    const fileBuffer = Buffer.from(fileBase64, "base64");
    const ct = contentType || "audio/mpeg";

    const now = new Date();
    const pad = n => String(n).padStart(2, "0");
    const shortDate = `${now.getUTCFullYear()}${pad(now.getUTCMonth()+1)}${pad(now.getUTCDate())}`;
    const dateStamp = `${shortDate}T${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}${pad(now.getUTCSeconds())}Z`;

    const region  = "auto";
    const service = "s3";
    const host    = R2_ENDPOINT.replace("https://", "");
    const objKey  = `${R2_BUCKET}/${path}`;
    const scope   = `${shortDate}/${region}/${service}/aws4_request`;
    const payloadHash = sha256hex(fileBuffer);

    const headers = {
      "content-type": ct,
      "host": host,
      "x-amz-content-sha256": payloadHash,
      "x-amz-date": dateStamp,
    };

    const signedHeaders = Object.keys(headers).sort().join(";");
    const canonicalHeaders = Object.entries(headers).sort(([a],[b]) => a.localeCompare(b)).map(([k,v]) => `${k}:${v}`).join("\n") + "\n";
    const canonicalRequest = ["PUT", `/${objKey}`, "", canonicalHeaders, signedHeaders, payloadHash].join("\n");
    const toSign = ["AWS4-HMAC-SHA256", dateStamp, scope, sha256hex(canonicalRequest)].join("\n");

    const kDate    = hmac(`AWS4${R2_SECRET}`, shortDate);
    const kRegion  = hmac(kDate, region);
    const kService = hmac(kRegion, service);
    const kSigning = hmac(kService, "aws4_request");
    const sig      = hmac(kSigning, toSign).toString("hex");

    const authorization = `AWS4-HMAC-SHA256 Credential=${R2_ACCESS}/${scope},SignedHeaders=${signedHeaders},Signature=${sig}`;

    const uploadRes = await fetch(`${R2_ENDPOINT}/${objKey}`, {
      method: "PUT",
      headers: { ...headers, "Authorization": authorization },
      body: fileBuffer,
    });

    if (!uploadRes.ok) {
      const errText = await uploadRes.text();
      return { statusCode: 500, headers: cors, body: JSON.stringify({ error: errText }) };
    }

    return { statusCode: 200, headers: cors, body: JSON.stringify({ success: true }) };

  } catch (e) {
    return { statusCode: 500, headers: cors, body: JSON.stringify({ error: e.message }) };
  }
};    const objectKey = `${R2_BUCKET}/${path}`;
    const expiresIn = 900;

    const credentialScope = `${shortDate}/${region}/${service}/aws4_request`;
    const credential = `${R2_ACCESS}/${credentialScope}`;

    // Query string in ordine alfabetico
    const queryString = [
      `X-Amz-Algorithm=AWS4-HMAC-SHA256`,
      `X-Amz-Credential=${encodeURIComponent(credential)}`,
      `X-Amz-Date=${dateStamp}`,
      `X-Amz-Expires=${expiresIn}`,
      `X-Amz-SignedHeaders=host`,
    ].join("&");

    const canonicalRequest = [
      "PUT",
      `/${objectKey}`,
      queryString,
      `host:${host}\n`,
      "host",
      "UNSIGNED-PAYLOAD",
    ].join("\n");

    const stringToSign = [
      "AWS4-HMAC-SHA256",
      dateStamp,
      credentialScope,
      sha256hex(canonicalRequest),
    ].join("\n");

    const kDate    = hmac(`AWS4${R2_SECRET}`, shortDate);
    const kRegion  = hmac(kDate, region);
    const kService = hmac(kRegion, service);
    const kSigning = hmac(kService, "aws4_request");
    const signature = hmac(kSigning, stringToSign).toString("hex");

    const presignedUrl = `${R2_ENDPOINT}/${objectKey}?${queryString}&X-Amz-Signature=${signature}`;

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({ presignedUrl }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
