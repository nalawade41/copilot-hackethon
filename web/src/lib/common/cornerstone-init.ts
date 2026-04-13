import { init as csRenderInit, imageLoader, utilities, Enums } from '@cornerstonejs/core';
import { init as csToolsInit } from '@cornerstonejs/tools';
import { init as dicomImageLoaderInit } from '@cornerstonejs/dicom-image-loader';

let initialized = false;

/**
 * Custom `web:` scheme loader for pre-rendered PNGs (server mode).
 * Cornerstone's imageLoader contract requires the function to synchronously
 * return `{ promise, cancelFn }` — NOT a Promise of that. The async work
 * lives inside `promise`.
 */
function loadWebImage(imageId: string) {
  const url = imageId.replace(/^web:/, '');

  const promise = (async () => {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`web image fetch failed: ${res.status}`);
    const blob = await res.blob();
    const bitmap = await createImageBitmap(blob);
    const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(bitmap, 0, 0);
    const rgba = ctx.getImageData(0, 0, bitmap.width, bitmap.height);

    const pixelData = new Uint8Array(bitmap.width * bitmap.height);
    for (let i = 0, j = 0; i < rgba.data.length; i += 4, j++) {
      pixelData[j] = rgba.data[i];
    }

    const voxelManager = utilities.VoxelManager.createImageVoxelManager({
      width: bitmap.width,
      height: bitmap.height,
      scalarData: pixelData,
      numberOfComponents: 1,
    });

    return {
      imageId,
      dataType: 'Uint8Array',
      numberOfComponents: 1,
      minPixelValue: 0,
      maxPixelValue: 255,
      slope: 1,
      intercept: 0,
      windowCenter: 128,
      windowWidth: 256,
      voiLUTFunction: Enums.VOILUTFunctionType.LINEAR,
      getPixelData: () => pixelData,
      getCanvas: () => canvas as unknown as HTMLCanvasElement,
      rows: bitmap.height,
      columns: bitmap.width,
      height: bitmap.height,
      width: bitmap.width,
      color: false,
      rgba: false,
      columnPixelSpacing: 1,
      rowPixelSpacing: 1,
      invert: false,
      sizeInBytes: pixelData.byteLength,
      voxelManager,
    };
  })();

  return { promise, cancelFn: undefined };
}

/**
 * Initialize Cornerstone3D exactly once for the lifetime of the page.
 * Safe to call multiple times — subsequent calls are no-ops.
 */
export async function initCornerstone(): Promise<void> {
  if (initialized) return;

  csRenderInit();
  csToolsInit();
  dicomImageLoaderInit({
    maxWebWorkers: Math.min(navigator.hardwareConcurrency || 1, 4),
  });
  imageLoader.registerImageLoader('web', loadWebImage as never);

  initialized = true;
}
