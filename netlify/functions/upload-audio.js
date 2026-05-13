const crypto = require("crypto");

const R2_ENDPOINT = "https://5152ba61567f02cdbb439af3630b10b4.r2.cloudflarestorage.com";
const R2_BUCKET   = "beatcave-audio";
const R2_ACCESS   = "8880ad678671b9e138a38986ea03a50e";
const R2_SECRET   = "0b17e135a1b61c007da4a4205f37474af5da7c58790f6db861dfb9b56385be74";

function hmac(key, data) {
  return crypto.createHmac("sha256", key).update(data).digest();
}

function sha256(data) {
  return crypto.createHash("sha256").update(data).digest("hex");
}

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
      },
      body: "",
    };
  }

  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method not allowed" };
  }

  try {
    const { path, contentType, fileBase64 } = JSON.parse(event.body);
    const fileBuffer = Buffer.from(fileBase64, "base64");

    const now = new Date();
    const dateStamp = now.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
    const shortDate = dateStamp.slice(0, 8);
    const region = "auto";
    const service = "s3";
    const host = R2_ENDPOINT.replace("https://", "").split("/")[0];
    const objectKey = `${R2_BUCKET}/${path}`;
    const payloadHash = sha256(fileBuffer);

    const headers = {
      "host": host,
      "x-amz-content-sha256": payloadHash,
      "x-amz-date": dateStamp,
      "content-type": contentType || "audio/mpeg",
    };

    const signedHeaders = Object.keys(headers).sort().join(";");
    const canonicalHeaders = Object.entries(headers)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}:${v}`)
      .join("\n") + "\n";

    const canonicalRequest = [
      "PUT",
      `/${objectKey}`,
      "",
      canonicalHeaders,
      signedHeaders,
      payloadHash,
    ].join("\n");

    const credentialScope = `${shortDate}/${region}/${service}/aws4_request`;
    const stringToSign = [
      "AWS4-HMAC-SHA256",
      dateStamp,
      credentialScope,
      sha256(canonicalRequest),
    ].join("\n");

    const kDate    = hmac(`AWS4${R2_SECRET}`, shortDate);
    const kRegion  = hmac(kDate, region);
    const kService = hmac(kRegion, service);
    const kSigning = hmac(kService, "aws4_request");
    const signature = hmac(kSigning, stringToSign).toString("hex");

    const authorization = `AWS4-HMAC-SHA256 Credential=${R2_ACCESS}/${credentialScope},SignedHeaders=${signedHeaders},Signature=${signature}`;

    const uploadRes = await fetch(`${R2_ENDPOINT}/${objectKey}`, {
      method: "PUT",
      headers: { ...headers, "Authorization": authorization },
      body: fileBuffer,
    });

    if (!uploadRes.ok) {
      const errText = await uploadRes.text();
      return {
        statusCode: 500,
        headers: { "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({ error: errText }),
      };
    }

    return {
      statusCode: 200,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ success: true }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ error: err.message }),
    };
  }
};
