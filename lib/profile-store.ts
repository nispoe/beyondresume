import { promises as fs } from "fs";
import path from "path";
import { get, put } from "@vercel/blob";
import johnProfile from "@/data/john-profile.json";
import jobProfile from "@/data/job-profile.json";

const JOHN_BLOB_PATH = "profiles/john-profile.json";
const JOB_BLOB_PATH = "profiles/job-profile.json";
const JSON_CONTENT_TYPE = "application/json; charset=utf-8";

function formatJson(value: unknown) {
  return JSON.stringify(value, null, 2) + "\n";
}

async function readBlobText(pathname: string) {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return null;
  }

  const result = await get(pathname, {
    access: "private",
    useCache: false
  });

  if (!result || result.statusCode !== 200 || !result.stream) {
    return null;
  }

  return await new Response(result.stream).text();
}

async function writeBlobText(pathname: string, text: string) {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return false;
  }

  await put(pathname, text, {
    access: "private",
    addRandomSuffix: false,
    allowOverwrite: true,
    cacheControlMaxAge: 60,
    contentType: JSON_CONTENT_TYPE
  });

  return true;
}

async function writeLocalFile(filename: string, text: string) {
  try {
    const filePath = path.join(process.cwd(), "data", filename);
    await fs.writeFile(filePath, text, "utf8");
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "EROFS") {
      throw new Error(
        "Profile persistence is not configured for this deployment yet. Add a Vercel Blob store to enable Update on Vercel."
      );
    }

    throw error;
  }
}

export function getDefaultJohnProfileText() {
  return formatJson(johnProfile);
}

export function getDefaultJobProfileText() {
  return formatJson(jobProfile);
}

export async function getStoredJohnProfileText() {
  return (await readBlobText(JOHN_BLOB_PATH)) ?? getDefaultJohnProfileText();
}

export async function getStoredJobProfileText() {
  return (await readBlobText(JOB_BLOB_PATH)) ?? getDefaultJobProfileText();
}

export async function saveStoredJohnProfileText(text: string) {
  if (await writeBlobText(JOHN_BLOB_PATH, text)) {
    return;
  }

  await writeLocalFile("john-profile.json", text);
}

export async function saveStoredJobProfileText(text: string) {
  if (await writeBlobText(JOB_BLOB_PATH, text)) {
    return;
  }

  await writeLocalFile("job-profile.json", text);
}
