// Phone cameras make 4000px, 5-12 MB photos; on a slow mobile link those take minutes to upload. A profile photo needs
// far less: it is scaled down on the device first (JPEG, longest side `maxSide`).
export async function shrinkImage(file: File, { maxSide = 1600, quality = 0.82 } = {}): Promise<File> {
  try {
    // createImageBitmap applies the photo's EXIF rotation, so a portrait shot stays upright
    const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const context = canvas.getContext('2d');
    if (!context) return file;
    // JPEG has no transparency: a transparent PNG gets a white background instead of black
    context.fillStyle = '#fff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
    // already small (or the browser could not encode it): the original is fine
    if (!blob || blob.size >= file.size) return file;
    return new File([blob], `${file.name.replace(/\.[^.]+$/, '') || 'photo'}.jpg`, { type: 'image/jpeg', lastModified: file.lastModified });
  } catch {
    // a format this browser cannot decode: send it as it is (the server still limits its size)
    return file;
  }
}
