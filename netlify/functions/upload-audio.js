const crypto = require("crypto");

const R2_ENDPOINT = "https://5152ba61567f02cdbb439af3630b10b4.r2.cloudflarestorage.com";
const R2_BUCKET   = "beatcave-audio";
const R2_ACCESS   = "8880ad678671b9e138a38986ea03a50e";
const R2_SECRET   = "0b17e135a1b61c007da4a4205f37474af5da7c58790f6db861dfb9b56385be74";

function hmac(key, data) {
  return crypto.createHmac("sha256", key).update(data).digest();
}

function sha256hex(data) {
  return crypto.createHash("sha256").update(data).digest("hex");
}

exports.handler = async (event) => {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers: corsHeaders, body: "" };
  }

  try {
    const { path, contentType } = JSON.parse(event.body);
    const ct = contentType || "audio/mpeg";

    const now = new Date();
    const dateStamp = now.toISOString().replace(/[-:]/g,"").replace(/\..+/,"Z");
    const shortDate = dateStamp.slice(0, 8);
    const region = "auto";
    const service = "s3";
    const host = new URL(R2_ENDPOINT).host;
    const objectKey = `${R2_BUCKET}/${path}`;
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
