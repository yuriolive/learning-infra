#!/usr/bin/env node

/**
 * Helper script to split GCP service account JSON credentials into 3 parts.
 * This is useful when storing minified credentials in environments with size limitations (e.g. Cloudflare).
 *
 * Usage: node scripts/split-gcp-credentials.js <path-to-json-file>
 */

import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const filePath = process.argv[2];

if (!filePath) {
  console.error(
    "Usage: node scripts/split-gcp-credentials.js path-to-json-file",
  );
  process.exit(1);
}

try {
  // Stricter initial validation of the input argument
  if (path.isAbsolute(filePath)) {
    console.error("Error: Absolute paths are not allowed.");
    process.exit(1);
  }

  // Ensure it looks like a relative path and doesn't contain suspicious characters
  if (filePath.includes("..") || filePath.includes("\0")) {
    console.error("Error: Invalid characters or path traversal detected.");
    process.exit(1);
  }

  const normalizedPath = path.normalize(filePath);

  const absolutePath = path.resolve(process.cwd(), normalizedPath);

  // Security: Prevent path traversal by ensuring the resolved path is within the project directory
  if (!absolutePath.startsWith(process.cwd())) {
    console.error(
      "Error: Access denied. Path is outside of the project directory.",
    );
    process.exit(1);
  }

  if (!fs.statSync(absolutePath).isFile()) {
    console.error(`Error: File not found at ${absolutePath}`);
    process.exit(1);
  }

  const content = fs.readFileSync(absolutePath, "utf8");
  // Minify: remove all whitespace
  const minified = content.replace(/\s/g, "");

  const totalLength = minified.length;
  const partSize = Math.ceil(totalLength / 3);

  const part1 = minified.substring(0, partSize);
  const part2 = minified.substring(partSize, partSize * 2);
  const part3 = minified.substring(partSize * 2);

  console.log("\n--- GCP CREDENTIALS PARTS ---\n");
  console.log("GOOGLE_APPLICATION_CREDENTIALS_PART_1:");
  console.log(part1);
  console.log("\nGOOGLE_APPLICATION_CREDENTIALS_PART_2:");
  console.log(part2);
  console.log("\nGOOGLE_APPLICATION_CREDENTIALS_PART_3:");
  console.log(part3);
  console.log("\n-----------------------------\n");
  console.log(`Total Minified Length: ${totalLength} characters`);
  console.log(`Each part is approximately ${partSize} characters.`);
} catch (error) {
  console.error("Error processing file:", error.message);
  process.exit(1);
}
