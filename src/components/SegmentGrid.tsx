import { useState } from "react";
import type { Segment } from "../types";

interface SegmentGridProps {
  segments: Segment[];
  onSegmentClick?: (segment: Segment) => void;
  onDelete?: (segmentId: string) => void;
}

export function SegmentGrid({
  segments,
  onSegmentClick,
  onDelete,
}: SegmentGridProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const handleCopyToClipboard = async (segment: Segment) => {
    try {
      // Create canvas for the segment
      const canvas = document.createElement("canvas");
      canvas.width = segment.imageData.width;
      canvas.height = segment.imageData.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Could not get canvas context");

      ctx.putImageData(segment.imageData, 0, 0);

      // Convert to blob
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (b) => (b ? resolve(b) : reject(new Error("Failed to create blob"))),
          "image/png"
        );
      });

      // Copy to clipboard
      await navigator.clipboard.write([
        new ClipboardItem({
          "image/png": blob,
        }),
      ]);

      // Show feedback
      setCopiedId(segment.id);
      setTimeout(() => setCopiedId(null), 2000);

      if (onSegmentClick) {
        onSegmentClick(segment);
      }
    } catch (error) {
      console.error("Failed to copy to clipboard:", error);
      alert(
        "Failed to copy to clipboard. Your browser may not support this feature."
      );
    }
  };

  const handleDownload = (segment: Segment, e: React.MouseEvent) => {
    e.stopPropagation();

    const canvas = document.createElement("canvas");
    canvas.width = segment.imageData.width;
    canvas.height = segment.imageData.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.putImageData(segment.imageData, 0, 0);

    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `segment-${segment.id}.png`;
      a.click();
      URL.revokeObjectURL(url);
    });
  };

  const handleDeleteClick = (segmentId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDelete) {
      onDelete(segmentId);
    }
  };

  if (segments.length === 0) {
    return (
      <div className="segment-grid-empty">
        <p>
          No segments yet. Click "Auto Segment" or double-click the image to
          segment it.
        </p>
      </div>
    );
  }

  return (
    <div className="segment-grid-container">
      <div className="segment-grid-header">
        <h3>
          {segments.length} Segment{segments.length !== 1 ? "s" : ""}
        </h3>
        <p className="grid-hint">Click any segment to copy to clipboard</p>
      </div>

      <div className="segment-grid">
        {segments.map((segment) => (
          <SegmentGridItem
            key={segment.id}
            segment={segment}
            isCopied={copiedId === segment.id}
            isHovered={hoveredId === segment.id}
            onCopy={() => handleCopyToClipboard(segment)}
            onDownload={(e) => handleDownload(segment, e)}
            onDelete={
              onDelete ? (e) => handleDeleteClick(segment.id, e) : undefined
            }
            onMouseEnter={() => setHoveredId(segment.id)}
            onMouseLeave={() => setHoveredId(null)}
          />
        ))}
      </div>
    </div>
  );
}

interface SegmentGridItemProps {
  segment: Segment;
  isCopied: boolean;
  isHovered: boolean;
  onCopy: () => void;
  onDownload: (e: React.MouseEvent) => void;
  onDelete?: (e: React.MouseEvent) => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}

function SegmentGridItem({
  segment,
  isCopied,
  isHovered,
  onCopy,
  onDownload,
  onDelete,
  onMouseEnter,
  onMouseLeave,
}: SegmentGridItemProps) {
  // Create thumbnail URL
  const getThumbnailUrl = () => {
    const canvas = document.createElement("canvas");
    canvas.width = segment.imageData.width;
    canvas.height = segment.imageData.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return "";

    ctx.putImageData(segment.imageData, 0, 0);
    return canvas.toDataURL("image/png");
  };

  return (
    <div
      className={`segment-grid-item ${isCopied ? "copied" : ""}`}
      onClick={onCopy}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <div className="segment-thumbnail">
        <img src={getThumbnailUrl()} alt="Segment" />

        {/* Overlay with actions */}
        {isHovered && !isCopied && (
          <div className="segment-overlay">
            <span className="copy-hint">📋 Click to copy</span>
          </div>
        )}

        {isCopied && (
          <div className="segment-overlay copied">
            <span className="copy-success">✓ Copied!</span>
          </div>
        )}
      </div>

      <div className="segment-actions">
        <button
          className="icon-btn download-btn"
          onClick={onDownload}
          title="Download segment"
        >
          💾
        </button>
        {onDelete && (
          <button
            className="icon-btn delete-btn-icon"
            onClick={onDelete}
            title="Delete segment"
          >
            🗑️
          </button>
        )}
      </div>

      <div className="segment-info">
        <span className="segment-size">
          {segment.bounds.width} × {segment.bounds.height}
        </span>
      </div>
    </div>
  );
}
