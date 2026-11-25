/** Normalises what people paste: "@name", "instagram.com/name/" or "name" all become "name". */
export function cleanHandle(raw: string): string {
  return raw
    .trim()
    .replace(/^https?:\/\/(www\.)?instagram\.com\//i, "")
    .replace(/^@/, "")
    .replace(/\/.*$/, "")
    .replace(/[^a-zA-Z0-9._]/g, "")
    .slice(0, 30);
}
