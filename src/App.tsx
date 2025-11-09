import { useState, useEffect, useRef } from 'react';
import { ImageInput } from './components/ImageInput';
import { SegmentGrid } from './components/SegmentGrid';
import { SAMStatus } from './components/SAMStatus';
import type { Segment } from './types';
import './App.css';

function App() {
  const [originalImage, setOriginalImage] = useState<HTMLImageElement | null>(null);
  const [imageData, setImageData] = useState<ImageData | null>(null);
  const [segments, setSegments] = useState<Segment[]>([]);
  const [isSegmenting, setIsSegmenting] = useState(false);
  const workerRef = useRef<Worker | null>(null);
  const nextZIndex = useRef(0);

  // Initialize Web Worker
  useEffect(() => {
    workerRef.current = new Worker(
      new URL('./workers/segmentation.worker.ts', import.meta.url),
      { type: 'module' }
    );

    workerRef.current.onmessage = (e) => {
      if (e.data.type === 'result') {
        const newSegments = e.data.segments.map((seg: any, index: number) =>
          createSegmentFromWorkerData(seg, imageData!, index)
        );
        setSegments(newSegments);
        setIsSegmenting(false);
      }
    };

    return () => {
      workerRef.current?.terminate();
    };
  }, [imageData]);

  const handleImageSelected = (imgData: ImageData, img: HTMLImageElement) => {
    setImageData(imgData);
    setOriginalImage(img);
    setSegments([]);
    nextZIndex.current = 0;
  };

  const handleSegmentImage = () => {
    if (!imageData || !workerRef.current) return;

    setIsSegmenting(true);
    workerRef.current.postMessage({
      type: 'segment',
      imageData,
    });
  };

  const handleImageClick = (e: React.MouseEvent<HTMLImageElement>) => {
    if (!imageData || !workerRef.current || isSegmenting || segments.length > 0) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const scaleX = imageData.width / rect.width;
    const scaleY = imageData.height / rect.height;

    setIsSegmenting(true);
    workerRef.current.postMessage({
      type: 'segment',
      imageData,
      clickPoint: {
        x: Math.floor(x * scaleX),
        y: Math.floor(y * scaleY),
      },
    });
  };

  const createSegmentFromWorkerData = (
    workerSegment: any,
    sourceImage: ImageData,
    index: number
  ): Segment => {
    const { maskData, bounds, id } = workerSegment;
    const { x, y, width, height } = bounds;

    // Extract the segment image data
    const segmentCanvas = document.createElement('canvas');
    segmentCanvas.width = width;
    segmentCanvas.height = height;
    const ctx = segmentCanvas.getContext('2d');
    if (!ctx) throw new Error('Could not get canvas context');

    const segmentImageData = ctx.createImageData(width, height);

    // Copy pixels from source image using mask
    for (let dy = 0; dy < height; dy++) {
      for (let dx = 0; dx < width; dx++) {
        const sourceX = x + dx;
        const sourceY = y + dy;
        const sourceIdx = (sourceY * sourceImage.width + sourceX) * 4;
        const maskIdx = sourceY * sourceImage.width + sourceX;
        const targetIdx = (dy * width + dx) * 4;

        if (maskData[maskIdx] > 0) {
          segmentImageData.data[targetIdx] = sourceImage.data[sourceIdx];
          segmentImageData.data[targetIdx + 1] = sourceImage.data[sourceIdx + 1];
          segmentImageData.data[targetIdx + 2] = sourceImage.data[sourceIdx + 2];
          segmentImageData.data[targetIdx + 3] = sourceImage.data[sourceIdx + 3];
        } else {
          segmentImageData.data[targetIdx + 3] = 0; // Transparent
        }
      }
    }

    // Create mask ImageData
    const maskImageData = ctx.createImageData(sourceImage.width, sourceImage.height);
    for (let i = 0; i < maskData.length; i++) {
      maskImageData.data[i * 4] = maskData[i];
      maskImageData.data[i * 4 + 1] = maskData[i];
      maskImageData.data[i * 4 + 2] = maskData[i];
      maskImageData.data[i * 4 + 3] = 255;
    }

    const zIndex = nextZIndex.current++;

    return {
      id,
      mask: maskImageData,
      bounds,
      position: { x, y },
      imageData: segmentImageData,
      zIndex,
      opacity: 1,
      rotation: 0,
      scale: 1,
    };
  };

  const handleDeleteSegment = (segmentId: string) => {
    setSegments(segments.filter(s => s.id !== segmentId));
  };

  const handleClearAll = () => {
    if (confirm('Clear all segments?')) {
      setSegments([]);
    }
  };

  const handleDownloadAll = () => {
    if (segments.length === 0) return;

    segments.forEach((segment, index) => {
      const canvas = document.createElement('canvas');
      canvas.width = segment.imageData.width;
      canvas.height = segment.imageData.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.putImageData(segment.imageData, 0, 0);

      canvas.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `segment-${index + 1}.png`;
        setTimeout(() => a.click(), index * 100); // Stagger downloads
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      });
    });
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>✂️ Image Cutout Tool</h1>
        <p>Segment images with AI and copy cutouts to your clipboard</p>
        <SAMStatus />
      </header>

      <main className="app-main">
        {!originalImage ? (
          <ImageInput onImageSelected={handleImageSelected} />
        ) : (
          <div className="cutout-container">
            {/* Left side - Original image */}
            <div className="image-preview-section">
              <div className="preview-header">
                <h3>Original Image</h3>
                <button
                  className="change-image-btn"
                  onClick={() => {
                    setOriginalImage(null);
                    setSegments([]);
                  }}
                >
                  Change Image
                </button>
              </div>

              <div className="image-preview">
                <img
                  src={originalImage.src}
                  alt="Original"
                  onClick={handleImageClick}
                  className={isSegmenting ? 'processing' : ''}
                />

                {segments.length === 0 && !isSegmenting && (
                  <div className="preview-overlay">
                    <button
                      className="segment-button"
                      onClick={handleSegmentImage}
                    >
                      ✨ Start Segmentation
                    </button>
                    <p className="hint">Or click anywhere on the image</p>
                  </div>
                )}

                {isSegmenting && (
                  <div className="preview-overlay">
                    <div className="loading">
                      <div className="spinner"></div>
                      <p>Segmenting image...</p>
                    </div>
                  </div>
                )}
              </div>

              {segments.length > 0 && (
                <div className="preview-actions">
                  <button onClick={handleSegmentImage} disabled={isSegmenting}>
                    ✨ Re-segment
                  </button>
                  <button onClick={handleDownloadAll}>
                    💾 Download All
                  </button>
                  <button onClick={handleClearAll} className="delete-btn">
                    🗑️ Clear All
                  </button>
                </div>
              )}
            </div>

            {/* Right side - Segment grid */}
            <div className="segments-section">
              <SegmentGrid
                segments={segments}
                onDelete={handleDeleteSegment}
              />

              {segments.length > 0 && (
                <div className="usage-tips">
                  <h4>💡 Tips</h4>
                  <ul>
                    <li>Click any segment to copy it to clipboard</li>
                    <li>Use 💾 to download individual segments</li>
                    <li>Paste copied segments into any app (Ctrl+V)</li>
                    <li>Re-segment to get different cutouts</li>
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
