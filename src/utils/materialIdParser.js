/**
 * Parses a Material ID image and extracts unique flat colors.
 * Material ID images use distinct solid colors to denote different regions/layers.
 */

/**
 * Load an image file into an HTMLImageElement.
 */
export function loadImage(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    if (file instanceof File || file instanceof Blob) {
      img.src = URL.createObjectURL(file);
    } else if (typeof file === 'string') {
      img.src = file;
    } else {
      reject(new Error('Invalid image source'));
    }
  });
}

/**
 * Extract unique colors from a Material ID image.
 * Returns an array of { color: '#RRGGBB', r, g, b, pixelCount, percentage, name }.
 * Colors are quantized to reduce near-duplicate flat colors.
 */
export function extractMaterialIdColors(image, tolerance = 16) {
  const canvas = document.createElement('canvas');
  canvas.width = image.naturalWidth || image.width;
  canvas.height = image.naturalHeight || image.height;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(image, 0, 0);

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  const totalPixels = canvas.width * canvas.height;

  // Quantize pixels and count occurrences
  const colorCounts = new Map();

  for (let i = 0; i < data.length; i += 4) {
    const r = quantize(data[i], tolerance);
    const g = quantize(data[i + 1], tolerance);
    const b = quantize(data[i + 2], tolerance);
    const a = data[i + 3];

    // Skip fully transparent pixels
    if (a < 128) continue;

    const key = `${r},${g},${b}`;
    colorCounts.set(key, (colorCounts.get(key) || 0) + 1);
  }

  // Convert to sorted array (most pixels first)
  const colors = Array.from(colorCounts.entries())
    .map(([key, count], index) => {
      const [r, g, b] = key.split(',').map(Number);
      return {
        r, g, b,
        color: rgbToHex(r, g, b),
        pixelCount: count,
        percentage: ((count / totalPixels) * 100).toFixed(1),
        name: `Layer_${index + 1}`,
      };
    })
    .sort((a, b) => b.pixelCount - a.pixelCount);

  return colors;
}

/**
 * Get the Material ID lookup data structure for fast pixel→layer mapping.
 * Returns { canvas, ctx, width, height, layers } where layers is the color list.
 */
export function createMaterialIdLookup(image, tolerance = 16) {
  const canvas = document.createElement('canvas');
  canvas.width = image.naturalWidth || image.width;
  canvas.height = image.naturalHeight || image.height;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(image, 0, 0);

  const layers = extractMaterialIdColors(image, tolerance);

  return {
    canvas,
    ctx,
    width: canvas.width,
    height: canvas.height,
    layers,
    /**
     * Sample the Material ID color at normalized UV coordinates (0..1).
     * Returns the matched layer index, or -1 if no match.
     */
    sampleAt(u, v, tol = tolerance) {
      const x = Math.round(u * (this.width - 1));
      const y = Math.round((1 - v) * (this.height - 1)); // flip Y for UV convention
      const pixel = this.ctx.getImageData(
        Math.max(0, Math.min(x, this.width - 1)),
        Math.max(0, Math.min(y, this.height - 1)),
        1, 1
      ).data;

      const pr = quantize(pixel[0], tol);
      const pg = quantize(pixel[1], tol);
      const pb = quantize(pixel[2], tol);

      for (let i = 0; i < this.layers.length; i++) {
        if (this.layers[i].r === pr && this.layers[i].g === pg && this.layers[i].b === pb) {
          return i;
        }
      }
      return 0; // Default to first layer
    },

    /**
     * Sample at screen-projected 2D coordinates (pixel x, y in the Material ID image).
     */
    sampleAtPixel(px, py, tol = tolerance) {
      const x = Math.max(0, Math.min(Math.round(px), this.width - 1));
      const y = Math.max(0, Math.min(Math.round(py), this.height - 1));
      const pixel = this.ctx.getImageData(x, y, 1, 1).data;

      const pr = quantize(pixel[0], tol);
      const pg = quantize(pixel[1], tol);
      const pb = quantize(pixel[2], tol);

      for (let i = 0; i < this.layers.length; i++) {
        if (this.layers[i].r === pr && this.layers[i].g === pg && this.layers[i].b === pb) {
          return i;
        }
      }
      return 0;
    },
  };
}

function quantize(value, step) {
  return Math.round(value / step) * step;
}

function rgbToHex(r, g, b) {
  return '#' + [r, g, b].map((c) => Math.min(255, Math.max(0, c)).toString(16).padStart(2, '0')).join('');
}
