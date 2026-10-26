interface DemoPhotoFile {
  bytes: Uint8Array;
  contentType: string;
}

declare global {
  var heypalDemoPhotoFiles: Map<string, DemoPhotoFile> | undefined;
}

function getFiles() {
  globalThis.heypalDemoPhotoFiles ??= new Map();
  return globalThis.heypalDemoPhotoFiles;
}

export function saveDemoPhotoFile(id: string, file: DemoPhotoFile) {
  getFiles().set(id, file);
}

export function getDemoPhotoFile(id: string) {
  return getFiles().get(id) ?? null;
}

export function removeDemoPhotoFile(id: string) {
  getFiles().delete(id);
}