// Web Worker for image segmentation using SAM REST API

const API_URL = 'http://localhost:5001';

interface SegmentationMessage {
  type: 'segment';
  imageData: ImageData;
  clickPoint?: { x: number; y: number };
}

interface SegmentationResult {
  type: 'result';
  segments: {
    id: string;
    maskData: Uint8ClampedArray;
    bounds: { x: number; y: number; width: number; height: number };
  }[];
}

self.onmessage = async (e: MessageEvent<SegmentationMessage>) => {
  if (e.data.type === 'segment') {
    const { imageData, clickPoint } = e.data;

    try {
      // Convert ImageData to base64
      const canvas = new OffscreenCanvas(imageData.width, imageData.height);
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Could not get canvas context');

      ctx.putImageData(imageData, 0, 0);
      const blob = await canvas.convertToBlob({ type: 'image/png' });
      const base64 = await blobToBase64(blob);

      // Prepare request payload
      const payload: any = {
        image: base64,
      };

      // Add point prompt if provided
      if (clickPoint) {
        payload.points = [
          { x: clickPoint.x, y: clickPoint.y, label: 1 }
        ];
      }

      // Call SAM API
      const response = await fetch(`${API_URL}/segment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.statusText}`);
      }

      const data = await response.json();

      // Convert API response to worker format
      const segments = data.segments
        .map((seg: any) => convertAPISegment(seg, imageData.width, imageData.height))
        .filter((seg: any) => seg !== null);

      const result: SegmentationResult = {
        type: 'result',
        segments,
      };

      self.postMessage(result);

    } catch (error) {
      console.error('Segmentation error:', error);

      // Fallback to simple flood-fill on error
      console.log('Falling back to local segmentation...');
      const segments = await performLocalSegmentation(imageData, clickPoint);

      const result: SegmentationResult = {
        type: 'result',
        segments,
      };

      self.postMessage(result);
    }
  }
};

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function convertAPISegment(
  apiSegment: any,
  imageWidth: number,
  imageHeight: number
): SegmentationResult['segments'][0] | null {
  try {
    // Decode base64 mask
    const maskData = Uint8Array.from(atob(apiSegment.maskData), c => c.charCodeAt(0));

    // Validate mask dimensions
    const expectedSize = apiSegment.maskShape.width * apiSegment.maskShape.height;
    if (maskData.length !== expectedSize) {
      console.error('Mask size mismatch');
      return null;
    }

    // Convert to Uint8ClampedArray with proper size
    const fullMask = new Uint8ClampedArray(imageWidth * imageHeight);

    // Copy mask data (it should already be the right size from SAM)
    if (apiSegment.maskShape.width === imageWidth && apiSegment.maskShape.height === imageHeight) {
      fullMask.set(maskData);
    } else {
      // If sizes don't match, we need to handle this case
      console.warn('Mask dimensions do not match image dimensions');
    }

    return {
      id: apiSegment.id,
      maskData: fullMask,
      bounds: apiSegment.bounds,
    };
  } catch (error) {
    console.error('Error converting API segment:', error);
    return null;
  }
}

// Fallback local segmentation (simplified flood-fill)
async function performLocalSegmentation(
  imageData: ImageData,
  clickPoint?: { x: number; y: number }
): Promise<SegmentationResult['segments']> {
  const { width, height, data } = imageData;
  const visited = new Uint8Array(width * height);
  const segments: SegmentationResult['segments'] = [];

  if (clickPoint) {
    const segment = floodFill(data, width, height, clickPoint.x, clickPoint.y, visited, 30);
    if (segment) segments.push(segment);
  } else {
    // Auto-segment with grid sampling
    const samplePoints = getSamplePoints(width, height, 20);
    for (const point of samplePoints) {
      const idx = point.y * width + point.x;
      if (visited[idx]) continue;

      const segment = floodFill(data, width, height, point.x, point.y, visited, 25);
      if (segment && segment.bounds.width > 20 && segment.bounds.height > 20) {
        segments.push(segment);
      }
      if (segments.length >= 15) break;
    }
  }

  return segments;
}

function getSamplePoints(width: number, height: number, count: number) {
  const points: { x: number; y: number }[] = [];
  const step = Math.floor(Math.sqrt((width * height) / count));

  for (let y = step; y < height; y += step) {
    for (let x = step; x < width; x += step) {
      points.push({ x, y });
    }
  }

  return points;
}

function floodFill(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  startX: number,
  startY: number,
  visited: Uint8Array,
  tolerance: number
) {
  const startIdx = (startY * width + startX) * 4;
  const targetColor = {
    r: data[startIdx],
    g: data[startIdx + 1],
    b: data[startIdx + 2],
  };

  const mask = new Uint8ClampedArray(width * height);
  const queue: { x: number; y: number }[] = [{ x: startX, y: startY }];

  let minX = startX, maxX = startX, minY = startY, maxY = startY;
  let pixelCount = 0;

  while (queue.length > 0) {
    const { x, y } = queue.shift()!;
    const idx = y * width + x;

    if (x < 0 || x >= width || y < 0 || y >= height) continue;
    if (visited[idx] || mask[idx]) continue;

    const pixelIdx = idx * 4;
    const colorDiff = Math.abs(data[pixelIdx] - targetColor.r) +
                     Math.abs(data[pixelIdx + 1] - targetColor.g) +
                     Math.abs(data[pixelIdx + 2] - targetColor.b);

    if (colorDiff > tolerance) continue;

    mask[idx] = 255;
    visited[idx] = 1;
    pixelCount++;

    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);

    queue.push({ x: x + 1, y });
    queue.push({ x: x - 1, y });
    queue.push({ x, y: y + 1 });
    queue.push({ x, y: y - 1 });

    if (pixelCount > width * height * 0.5) break;
  }

  if (pixelCount < 100) return null;

  return {
    id: `segment-${Date.now()}-${Math.random()}`,
    maskData: mask,
    bounds: {
      x: minX,
      y: minY,
      width: maxX - minX + 1,
      height: maxY - minY + 1,
    },
  };
}
