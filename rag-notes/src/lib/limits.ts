// Under Vercel's 4.5 MB request-body limit. Dependency-free so the
// client (Library) can import it without bundling unpdf.
export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;
export const MAX_UPLOAD_LABEL = "4 MB";
