import { NextRequest, NextResponse } from "next/server";

function parseBrowser(userAgent: string) {
  if (/edg\//i.test(userAgent)) {
    return "Microsoft Edge";
  }

  if (/opr\/|opera/i.test(userAgent)) {
    return "Opera";
  }

  if (/chrome\//i.test(userAgent) && !/edg\//i.test(userAgent)) {
    return "Google Chrome";
  }

  if (/safari\//i.test(userAgent) && !/chrome\//i.test(userAgent)) {
    return "Safari";
  }

  if (/firefox\//i.test(userAgent)) {
    return "Mozilla Firefox";
  }

  return "Unknown";
}

function parseOs(userAgent: string) {
  if (/windows/i.test(userAgent)) {
    return "Windows";
  }

  if (/mac os x|macintosh/i.test(userAgent)) {
    return "macOS";
  }

  if (/iphone|ipad|ios/i.test(userAgent)) {
    return "iOS";
  }

  if (/android/i.test(userAgent)) {
    return "Android";
  }

  if (/linux/i.test(userAgent)) {
    return "Linux";
  }

  return "Unknown";
}

function parseDevice(userAgent: string) {
  if (/ipad|tablet/i.test(userAgent)) {
    return "Tablet";
  }

  if (/mobi|iphone|android/i.test(userAgent)) {
    return "Mobile";
  }

  return "Desktop";
}

function extractVersion(userAgent: string, pattern: RegExp) {
  const match = userAgent.match(pattern);
  return match?.[1] ?? null;
}

function parseBrowserVersion(userAgent: string) {
  if (/edg\//i.test(userAgent)) {
    return extractVersion(userAgent, /edg\/([\d.]+)/i);
  }

  if (/opr\/|opera/i.test(userAgent)) {
    return extractVersion(userAgent, /(?:opr|opera)\/([\d.]+)/i);
  }

  if (/chrome\//i.test(userAgent) && !/edg\//i.test(userAgent)) {
    return extractVersion(userAgent, /chrome\/([\d.]+)/i);
  }

  if (/firefox\//i.test(userAgent)) {
    return extractVersion(userAgent, /firefox\/([\d.]+)/i);
  }

  if (/version\//i.test(userAgent) && /safari\//i.test(userAgent)) {
    return extractVersion(userAgent, /version\/([\d.]+)/i);
  }

  return null;
}

function parseOsVersion(userAgent: string, os: string) {
  if (os === "iOS") {
    return extractVersion(userAgent, /(?:cpu (?:iphone )?os|os) ([\d_]+)/i)?.replaceAll("_", ".");
  }

  if (os === "Android") {
    return extractVersion(userAgent, /android ([\d.]+)/i);
  }

  if (os === "macOS") {
    return extractVersion(userAgent, /mac os x ([\d_]+)/i)?.replaceAll("_", ".");
  }

  if (os === "Windows") {
    return extractVersion(userAgent, /windows nt ([\d.]+)/i);
  }

  return null;
}

function parseDeviceName(userAgent: string, os: string, device: string) {
  if (/ipad/i.test(userAgent)) {
    return "iPad";
  }

  if (/iphone/i.test(userAgent)) {
    return "iPhone";
  }

  if (/android/i.test(userAgent)) {
    if (/tablet/i.test(userAgent)) {
      return "Android Tablet";
    }

    return device === "Tablet" ? "Android Tablet" : "Android Phone";
  }

  if (os === "macOS") {
    return "Mac";
  }

  if (os === "Windows") {
    return "Windows PC";
  }

  if (os === "Linux") {
    return device === "Desktop" ? "Linux PC" : "Linux Device";
  }

  return null;
}

function extractIpAddress(req: NextRequest) {
  const forwardedFor = req.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() ?? null;
  }

  return req.headers.get("x-real-ip");
}

export async function GET(req: NextRequest) {
  const userAgent = req.headers.get("user-agent") ?? "";
  const browser = parseBrowser(userAgent);
  const os = parseOs(userAgent);
  const device = parseDevice(userAgent);

  return NextResponse.json({
    browser,
    browserVersionGuess: parseBrowserVersion(userAgent),
    os,
    osVersionGuess: parseOsVersion(userAgent, os),
    device,
    deviceNameGuess: parseDeviceName(userAgent, os, device),
    ipAddress: extractIpAddress(req),
    userAgent: userAgent || null,
  });
}
