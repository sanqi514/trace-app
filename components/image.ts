"use client";

// 图片处理工具：压缩 + 大小限制，避免大图撑爆 IndexedDB / 拖慢渲染。
// 全程在浏览器本地完成，图片不上传。

export const MAX_IMAGES = 4; // 单条记录最多图片数
const MAX_EDGE = 1600; // 最长边像素，超出按比例缩小
const QUALITY = 0.82; // JPEG 质量

/**
 * 读取一个图片文件 → 压缩 → 返回 Blob（jpeg）。
 * 失败时回退为原始文件。
 */
export async function compressImage(file: File): Promise<Blob> {
  if (!file.type.startsWith("image/")) return file;
  try {
    const bitmap = await loadBitmap(file);
    const { width, height } = bitmap;
    const scale = Math.min(1, MAX_EDGE / Math.max(width, height));
    const w = Math.round(width * scale);
    const h = Math.round(height * scale);

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, w, h);
    if ("close" in bitmap) (bitmap as ImageBitmap).close?.();

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob((b) => resolve(b), "image/jpeg", QUALITY)
    );
    return blob || file;
  } catch {
    return file;
  }
}

async function loadBitmap(file: File): Promise<ImageBitmap | HTMLImageElement> {
  // 优先用 createImageBitmap（快、支持 EXIF 方向校正）
  if (typeof createImageBitmap === "function") {
    try {
      return await createImageBitmap(file, { imageOrientation: "from-image" } as any);
    } catch {
      /* 回退到 <img> */
    }
  }
  return await new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = (e) => {
      URL.revokeObjectURL(url);
      reject(e);
    };
    img.src = url;
  });
}

/** 处理一组文件：逐个压缩，受 MAX_IMAGES 与剩余配额限制 */
export async function processImages(files: FileList | File[], remaining: number): Promise<Blob[]> {
  const arr = Array.from(files).filter((f) => f.type.startsWith("image/"));
  const slice = arr.slice(0, Math.max(0, remaining));
  return Promise.all(slice.map(compressImage));
}
