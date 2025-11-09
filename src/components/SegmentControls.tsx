import { Segment } from '../types';

interface SegmentControlsProps {
  selectedSegmentId: string | null;
  segments: Segment[];
  onBringToFront: () => void;
  onSendToBack: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onClearAll: () => void;
  onOpacityChange: (opacity: number) => void;
  onRotationChange: (rotation: number) => void;
  onScaleChange: (scale: number) => void;
}

export function SegmentControls({
  selectedSegmentId,
  segments,
  onBringToFront,
  onSendToBack,
  onDelete,
  onDuplicate,
  onClearAll,
  onOpacityChange,
  onRotationChange,
  onScaleChange,
}: SegmentControlsProps) {
  const selectedSegment = segments.find(s => s.id === selectedSegmentId);
  const hasSegments = segments.length > 0;
  const hasSelection = selectedSegmentId !== null;

  return (
    <div className="segment-controls">
      <div className="controls-section">
        <h3>Layer Controls</h3>
        <div className="button-group">
          <button
            onClick={onBringToFront}
            disabled={!hasSelection}
            title="Bring to Front (Ctrl+])"
          >
            ⬆️ Bring to Front
          </button>
          <button
            onClick={onSendToBack}
            disabled={!hasSelection}
            title="Send to Back (Ctrl+[)"
          >
            ⬇️ Send to Back
          </button>
        </div>
      </div>

      <div className="controls-section">
        <h3>Segment Actions</h3>
        <div className="button-group">
          <button
            onClick={onDuplicate}
            disabled={!hasSelection}
            title="Duplicate (Ctrl+D)"
          >
            📋 Duplicate
          </button>
          <button
            onClick={onDelete}
            disabled={!hasSelection}
            className="delete-btn"
            title="Delete (Delete)"
          >
            🗑️ Delete
          </button>
          <button
            onClick={onClearAll}
            disabled={!hasSegments}
            className="delete-btn"
            title="Clear All"
          >
            ❌ Clear All
          </button>
        </div>
      </div>

      {hasSelection && selectedSegment && (
        <div className="controls-section">
          <h3>Transform</h3>

          <div className="slider-control">
            <label>
              Opacity: {Math.round(selectedSegment.opacity * 100)}%
            </label>
            <input
              type="range"
              min="0"
              max="100"
              value={selectedSegment.opacity * 100}
              onChange={(e) => onOpacityChange(Number(e.target.value) / 100)}
            />
          </div>

          <div className="slider-control">
            <label>
              Rotation: {selectedSegment.rotation}°
            </label>
            <input
              type="range"
              min="0"
              max="360"
              value={selectedSegment.rotation}
              onChange={(e) => onRotationChange(Number(e.target.value))}
            />
          </div>

          <div className="slider-control">
            <label>
              Scale: {Math.round(selectedSegment.scale * 100)}%
            </label>
            <input
              type="range"
              min="10"
              max="200"
              value={selectedSegment.scale * 100}
              onChange={(e) => onScaleChange(Number(e.target.value) / 100)}
            />
          </div>
        </div>
      )}

      <div className="controls-section shortcuts">
        <h3>Keyboard Shortcuts</h3>
        <div className="shortcuts-list">
          <div><kbd>Delete</kbd> Delete segment</div>
          <div><kbd>Ctrl+D</kbd> Duplicate</div>
          <div><kbd>Ctrl+]</kbd> Bring to front</div>
          <div><kbd>Ctrl+[</kbd> Send to back</div>
          <div><kbd>Esc</kbd> Deselect</div>
        </div>
      </div>
    </div>
  );
}
