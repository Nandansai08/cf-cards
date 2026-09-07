export type SaveResult = "downloaded" | "shared" | "opened" | "cancelled";

/**
 * Hands a rendered blob to the browser as a file.
 *
 * Deliberately not a `data:` URL: a card exports to several megabytes of
 * base64, which browsers hold entirely in memory and some refuse to download
 * at all. An object URL is small, revocable and works with `download`.
 *
 * On touch devices the share sheet is the native "save to photos" route and
 * the one most likely to survive a mobile browser's download restrictions, so
 * it wins there when the browser offers it. Everything else falls back to an
 * anchor, and finally to simply opening the image so it can be saved by hand.
 */
export async function saveBlob(blob: Blob, filename: string): Promise<SaveResult> {
  const file = new File([blob], filename, { type: blob.type || "image/png" });

  const touch = window.matchMedia?.("(pointer: coarse)").matches ?? false;
  if (touch && typeof navigator.canShare === "function" && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file] });
      return "shared";
    } catch (error) {
      // Dismissing the sheet is a choice, not a failure. Anything else means
      // sharing is unavailable in practice, so fall through to the anchor.
      if (error instanceof DOMException && error.name === "AbortError") return "cancelled";
    }
  }

  const url = URL.createObjectURL(blob);
  try {
    const anchor = document.createElement("a");
    if (typeof anchor.download !== "string") {
      window.open(url, "_blank", "noopener");
      return "opened";
    }
    anchor.href = url;
    anchor.download = filename;
    anchor.style.display = "none";
    // Firefox only dispatches the click for an anchor that is in the document.
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    return "downloaded";
  } finally {
    // Long enough for the browser to have started reading the blob.
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  }
}
