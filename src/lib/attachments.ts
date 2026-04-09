const MIME_EXTENSION_MAP: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/svg+xml": "svg",
  "image/heic": "heic",
  "application/pdf": "pdf",
  "text/plain": "txt",
  "application/msword": "doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  "application/vnd.ms-excel": "xls",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
};

export function isImageFile(file: File) {
  return file.type.startsWith("image/");
}

export function createPendingFile(file: File) {
  return {
    file,
    preview: isImageFile(file) ? URL.createObjectURL(file) : "",
  };
}

export function revokePendingFiles(files: Array<{ preview: string }>) {
  files.forEach((file) => {
    if (file.preview) URL.revokeObjectURL(file.preview);
  });
}

function getFileExtension(file: File) {
  const fileName = file.name?.trim() || "";
  const fromName = fileName.includes(".") ? fileName.split(".").pop()?.toLowerCase() : undefined;
  return fromName || MIME_EXTENSION_MAP[file.type] || "bin";
}

export function getAttachmentDisplayName(file: File) {
  if (file.name?.trim()) return file.name.trim();
  const extension = getFileExtension(file);
  return `${isImageFile(file) ? "imagem" : "arquivo"}.${extension}`;
}

export function buildStorageFileName(file: File) {
  const extension = getFileExtension(file);
  const uniqueId = typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

  return `${uniqueId}.${extension}`;
}

export function getClipboardImageFiles(items: DataTransferItemList | DataTransferItem[]) {
  const timestamp = Date.now();

  return Array.from(items)
    .map((item, index) => {
      if (!item.type.startsWith("image/")) return null;

      const file = item.getAsFile();
      if (!file) return null;

      const fileName = file.name?.trim() || `imagem-colada-${timestamp}-${index + 1}.${MIME_EXTENSION_MAP[file.type] || "png"}`;

      return new File([file], fileName, {
        type: file.type || "image/png",
        lastModified: file.lastModified || timestamp,
      });
    })
    .filter((file): file is File => Boolean(file));
}