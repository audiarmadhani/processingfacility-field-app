export function checkInPhotoStorageKey(fermentationId: number) {
  return `checkin-photo-${fermentationId}`;
}

export async function dataUrlToFile(dataUrl: string, filename: string) {
  const blob = await fetch(dataUrl).then((response) => response.blob());
  return new File([blob], filename, { type: blob.type || "image/jpeg" });
}

export async function loadStoredCheckInPhoto(fermentationId: number) {
  const key = checkInPhotoStorageKey(fermentationId);
  const dataUrl = sessionStorage.getItem(key);
  if (!dataUrl) {
    return null;
  }

  sessionStorage.removeItem(key);
  const file = await dataUrlToFile(dataUrl, `checkin_${Date.now()}.jpg`);
  return {
    file,
    previewUrl: dataUrl,
  };
}

export function storeCheckInPhoto(fermentationId: number, dataUrl: string) {
  sessionStorage.setItem(checkInPhotoStorageKey(fermentationId), dataUrl);
}
