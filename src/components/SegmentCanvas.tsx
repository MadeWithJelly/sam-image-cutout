import { useEffect, useRef, useState } from "react";
import { Stage, Layer, Image as KonvaImage, Group, Rect } from "react-konva";
import Konva from "konva";
import type { Segment } from "../types";

interface SegmentCanvasProps {
  originalImage: HTMLImageElement;
  segments: Segment[];
  selectedId: string | null;
  onSegmentsUpdate: (segments: Segment[]) => void;
  onSegmentClick?: (point: { x: number; y: number }) => void;
  onSelectionChange: (id: string | null) => void;
}

export function SegmentCanvas({
  originalImage,
  segments,
  selectedId,
  onSegmentsUpdate,
  onSegmentClick,
  onSelectionChange,
}: SegmentCanvasProps) {
  const stageRef = useRef<Konva.Stage>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });

  useEffect(() => {
    if (!originalImage) return;

    const maxWidth = 1000;
    const maxHeight = 700;
    const ratio = Math.min(
      maxWidth / originalImage.width,
      maxHeight / originalImage.height,
      1
    );

    setDimensions({
      width: originalImage.width * ratio,
      height: originalImage.height * ratio,
    });
  }, [originalImage]);

  const handleStageClick = (e: Konva.KonvaEventObject<MouseEvent>) => {
    // If clicked on empty area, deselect
    if (e.target === e.target.getStage() || e.target.getClassName() === 'Image') {
      onSelectionChange(null);
      return;
    }
  };

  const handleBackgroundDblClick = (e: Konva.KonvaEventObject<MouseEvent>) => {
    const target = e.target;

    // Only trigger on background image double-click
    if (target.getClassName() === 'Image' && onSegmentClick) {
      const stage = e.target.getStage();
      if (!stage) return;

      const pos = stage.getPointerPosition();
      if (!pos) return;

      const scale = originalImage.width / dimensions.width;
      onSegmentClick({
        x: Math.floor(pos.x * scale),
        y: Math.floor(pos.y * scale),
      });
    }
  };

  const handleDragEnd = (
    segmentId: string,
    e: Konva.KonvaEventObject<DragEvent>
  ) => {
    const node = e.target;
    const newSegments = segments.map((seg) => {
      if (seg.id === segmentId) {
        return {
          ...seg,
          position: {
            x: node.x(),
            y: node.y(),
          },
        };
      }
      return seg;
    });
    onSegmentsUpdate(newSegments);
  };

  const handleTransformEnd = (
    segmentId: string,
    e: Konva.KonvaEventObject<Event>
  ) => {
    const node = e.target as Konva.Group;
    const newSegments = segments.map((seg) => {
      if (seg.id === segmentId) {
        return {
          ...seg,
          position: {
            x: node.x(),
            y: node.y(),
          },
          rotation: node.rotation(),
          scale: node.scaleX(), // Assuming uniform scaling
        };
      }
      return seg;
    });
    onSegmentsUpdate(newSegments);
  };

  // Sort segments by zIndex for proper rendering order
  const sortedSegments = [...segments].sort((a, b) => a.zIndex - b.zIndex);

  return (
    <div ref={containerRef} className="segment-canvas">
      <Stage
        ref={stageRef}
        width={dimensions.width}
        height={dimensions.height}
        onClick={handleStageClick}
      >
        <Layer>
          {/* Background image */}
          <KonvaImage
            image={originalImage}
            width={dimensions.width}
            height={dimensions.height}
            listening={true}
            onDblClick={handleBackgroundDblClick}
          />

          {/* Render segments in z-index order */}
          {sortedSegments.map((segment) => (
            <SegmentNode
              key={segment.id}
              segment={segment}
              scale={dimensions.width / originalImage.width}
              isSelected={segment.id === selectedId}
              onSelect={() => onSelectionChange(segment.id)}
              onDragEnd={(e) => handleDragEnd(segment.id, e)}
              onTransformEnd={(e) => handleTransformEnd(segment.id, e)}
            />
          ))}
        </Layer>
      </Stage>
    </div>
  );
}

interface SegmentNodeProps {
  segment: Segment;
  scale: number;
  isSelected: boolean;
  onSelect: () => void;
  onDragEnd: (e: Konva.KonvaEventObject<DragEvent>) => void;
  onTransformEnd: (e: Konva.KonvaEventObject<Event>) => void;
}

function SegmentNode({
  segment,
  scale,
  isSelected,
  onSelect,
  onDragEnd,
  onTransformEnd,
}: SegmentNodeProps) {
  const imageRef = useRef<Konva.Image>(null);
  const groupRef = useRef<Konva.Group>(null);
  const [image, setImage] = useState<HTMLImageElement | null>(null);

  useEffect(() => {
    // Create image from segment's ImageData
    const canvas = document.createElement("canvas");
    canvas.width = segment.imageData.width;
    canvas.height = segment.imageData.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.putImageData(segment.imageData, 0, 0);

    const img = new Image();
    img.onload = () => setImage(img);
    img.src = canvas.toDataURL();
  }, [segment.imageData]);

  if (!image) return null;

  const width = segment.bounds.width * scale;
  const height = segment.bounds.height * scale;

  return (
    <Group
      ref={groupRef}
      x={segment.position.x * scale}
      y={segment.position.y * scale}
      draggable
      rotation={segment.rotation}
      scaleX={segment.scale}
      scaleY={segment.scale}
      onDragEnd={onDragEnd}
      onTransformEnd={onTransformEnd}
      onClick={onSelect}
      onTap={onSelect}
    >
      {/* Segment image */}
      <KonvaImage
        ref={imageRef}
        image={image}
        width={width}
        height={height}
        opacity={segment.opacity}
      />

      {/* Selection indicator */}
      {isSelected && (
        <>
          {/* Bounding box */}
          <Rect
            x={0}
            y={0}
            width={width}
            height={height}
            stroke="#00ff00"
            strokeWidth={2 / segment.scale}
            dash={[5, 5]}
            listening={false}
          />

          {/* Corner handles */}
          {[
            { x: 0, y: 0 },
            { x: width, y: 0 },
            { x: width, y: height },
            { x: 0, y: height },
          ].map((pos, i) => (
            <Rect
              key={i}
              x={pos.x - 4 / segment.scale}
              y={pos.y - 4 / segment.scale}
              width={8 / segment.scale}
              height={8 / segment.scale}
              fill="#00ff00"
              listening={false}
            />
          ))}
        </>
      )}
    </Group>
  );
}
