import { NextResponse } from "next/server";
import crypto from "crypto";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { paramsToSign } = body;

    if (!paramsToSign) {
      return NextResponse.json({ error: "Params to sign are required" }, { status: 400 });
    }

    const apiSecret = process.env.CLOUDINARY_API_SECRET;
    if (!apiSecret) {
      return NextResponse.json({ error: "Cloudinary API Secret is not configured" }, { status: 500 });
    }

    // Sort parameters alphabetically by key
    const sortedKeys = Object.keys(paramsToSign).sort();
    const paramString = sortedKeys
      .map((key) => `${key}=${paramsToSign[key]}`)
      .join("&");

    // Generate SHA-1 hash signature: <parameters_string><api_secret>
    const stringToSign = `${paramString}${apiSecret}`;
    const signature = crypto.createHash("sha1").update(stringToSign).digest("hex");

    return NextResponse.json({ signature });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal Server Error" },
      { status: 500 }
    );
  }
}
