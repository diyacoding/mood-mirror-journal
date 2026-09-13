// Client-side image validation + downscaling used before a pet photo is stored.
// Keeps Firebase Storage / Firestore payloads small while staying scrapbook-sharp.

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10MB source limit
const MAX_EDGE = 1024; // longest edge after resize

export function validateImageFile(file: File): void {
  if (!file.type.startsWith("image/")) {
    throw new Error("Please choose an image file (JPG, PNG, HEIC or WEBP).");
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new Error("That photo is too large. Please pick one under 10MB.");
  }
}

const loadImage = (src: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("We couldn't read that image."));
    img.src = src;
  });

/** Resize (max 1024px edge) and re-encode as PNG data URL. */
export async function compressImageFile(file: File): Promise<string> {
  validateImageFile(file);
  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await loadImage(objectUrl);
    const scale = Math.min(1, MAX_EDGE / Math.max(img.width, img.height));
    const w = Math.max(1, Math.round(img.width * scale));
    const h = Math.max(1, Math.round(img.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("We couldn't process that image.");
    ctx.drawImage(img, 0, 0, w, h);
    // JPEG keeps the file small for photos; quality 0.85 stays crisp in the scrapbook.
    return canvas.toDataURL("image/jpeg", 0.85);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export function dataUrlToBlob(dataUrl: string): Blob {
  const [head, body] = dataUrl.split(",");
  const mime = /:(.*?);/.exec(head)?.[1] ?? "image/jpeg";
  const bin = atob(body);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}
