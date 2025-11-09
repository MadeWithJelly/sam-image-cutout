# ✂️ Image Cutout Tool

A browser-based image cutout tool powered by Meta's Segment Anything Model (SAM). Upload any image, automatically segment objects, and copy/download individual cutouts with a single click.

## Features

- **🎯 One-Click Segmentation**: Automatically detect and segment all objects in an image
- **📋 Clipboard Copy**: Click any segment to instantly copy it to your clipboard
- **💾 Individual Downloads**: Download each cutout separately or all at once
- **🤖 AI-Powered**: Uses Meta's SAM for state-of-the-art object detection
- **📸 Webcam Support**: Capture images directly from your webcam
- **⚡ Fast & Responsive**: Web Worker processing keeps the UI smooth
- **🔄 Smart Fallback**: Works offline with local segmentation if SAM API is unavailable
- **🎨 Clean Interface**: Grid view with thumbnail previews and visual feedback

## Tech Stack

### Frontend
- **React + TypeScript**: Modern React with full type safety
- **Vite**: Fast build tool and dev server
- **Konva.js**: High-performance 2D canvas library for interactive graphics
- **Web Workers**: Off-thread processing for segmentation

### Backend (SAM REST API)
- **Python + Flask**: Lightweight REST API server
- **PyTorch**: Deep learning framework for SAM
- **Segment Anything**: Meta's official SAM implementation
- **OpenCV & Pillow**: Image processing utilities

## Getting Started

This project consists of two parts: the frontend (React app) and the backend (Python REST API for SAM). You can run the frontend without the backend (it will fall back to local segmentation), but for best results, run both.

### Option 1: Quick Start (Frontend Only)

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

The app will run at http://localhost:5173 and use local color-based segmentation.

### Option 2: Full Setup (Frontend + SAM API)

#### Prerequisites

- Node.js 16+ and npm
- Python 3.8+ and pip
- (Optional) CUDA-capable GPU for faster inference

#### Step 1: Start the SAM REST API

```bash
# Navigate to the REST API directory
cd rest

# Create a virtual environment (recommended)
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Start the API server
python app.py
```

The API will:
1. Download the SAM model (~375MB) on first run
2. Start on http://localhost:5001
3. Show "SAM model ready!" when initialized

See [rest/README.md](rest/README.md) for detailed API documentation.

#### Step 2: Start the Frontend

```bash
# In a new terminal, from the project root
npm install

# Start development server
npm run dev
```

The app will run at http://localhost:5173 and automatically connect to the SAM API.

## Usage

Perfect for designers, content creators, and anyone who needs to extract objects from images!

### Step 1: Upload an Image
- Click **"Upload Image"** to select an image from your device
- Or click **"Use Webcam"** to capture from your camera
- The image appears on the left side of the screen

### Step 2: Segment the Image
- Click **"✨ Start Segmentation"** button or click anywhere on the image
- SAM automatically detects and segments all objects
- Segments appear as thumbnails in a grid on the right

### Step 3: Copy or Download Cutouts
- **Click any segment** in the grid to copy it to your clipboard
- See a green checkmark when copied successfully
- Use **💾 button** to download individual segments as PNG files
- Click **"Download All"** to save all segments at once

### Step 4: Use Your Cutouts
- **Paste** (Ctrl+V / Cmd+V) into any application:
  - Photoshop, Figma, Canva
  - Word, PowerPoint, Google Docs
  - Discord, Slack, Email
  - Any app that accepts images!

### Pro Tips
- **Re-segment**: Click "Re-segment" to get different cutout results
- **Delete segments**: Click 🗑️ on individual segments you don't need
- **Clear all**: Remove all segments and start over
- **Transparent backgrounds**: All cutouts have transparent backgrounds

## Architecture

### Frontend Structure

```
src/
├── components/
│   ├── ImageInput.tsx         # Image upload & webcam capture
│   ├── SegmentGrid.tsx        # Grid view with clipboard copy
│   ├── SegmentCanvas.tsx      # Advanced canvas manipulation (legacy)
│   ├── SegmentControls.tsx    # Segment transformation controls (legacy)
│   └── SAMStatus.tsx          # API connection status
├── workers/
│   └── segmentation.worker.ts # Background SAM processing
├── types.ts                   # TypeScript definitions
├── config.ts                  # Configuration
└── App.tsx                    # Main cutout tool UI
```

### Backend Structure

```
rest/
├── app.py                     # Flask REST API
├── sam_service.py             # SAM model wrapper
├── requirements.txt           # Python dependencies
└── models/                    # Downloaded SAM models (auto-created)
```

### Data Flow

1. **Image Upload**: User uploads image or captures from webcam
2. **Worker Processing**: Image sent to Web Worker (off main thread)
3. **API Call**: Worker sends image to SAM REST API
4. **SAM Inference**: Python backend runs SAM model on image
5. **Mask Generation**: SAM returns segmentation masks
6. **Rendering**: Konva renders interactive segments
7. **User Interaction**: Drag segments, modify composition
8. **Export**: Download final composited image

### Fallback Behavior

If the SAM API is not available, the app automatically falls back to a local color-based flood-fill algorithm. This provides:
- No external dependencies required
- Instant setup
- Reasonable segmentation for simple images
- Smooth user experience (no errors)

## Configuration

Edit `src/config.ts` to customize:

```typescript
export const config = {
  samApiUrl: 'http://localhost:5001',  // SAM API endpoint
  useSamApi: true,                     // Enable/disable SAM
  maxSegments: 15,                     // Max auto-segments
};
```

## SAM Model Variants

The default model is `vit_b` (smallest, fastest). To use a different variant, edit `rest/sam_service.py`:

- **vit_b**: ~375MB, fastest, good quality
- **vit_l**: ~1.2GB, slower, better quality
- **vit_h**: ~2.4GB, slowest, best quality

## Performance Tips

- **GPU Acceleration**: SAM runs much faster with CUDA
- **Image Size**: Smaller images process faster (SAM resizes to 1024x1024)
- **Model Caching**: Model stays loaded in memory after first request
- **Web Workers**: Frontend processing never blocks the UI

## Browser Support

- Modern browsers with ES2020+ support
- WebGL recommended for optimal performance
- Webcam requires HTTPS (except on localhost)

## Development

### Frontend

```bash
# Run type checking
npx tsc --noEmit

# Lint code
npm run lint

# Build for production
npm run build

# Preview production build
npm run preview
```

### Backend

```bash
# Run with auto-reload
python app.py

# Test API
curl http://localhost:5001/health
```

## Troubleshooting

### SAM API shows "disconnected"
- Ensure Python server is running on port 5001
- Check `rest/app.py` is running without errors
- Model download can take 5-10 minutes on first run

### Segmentation is slow
- Use GPU if available (CUDA)
- Consider using `vit_b` model instead of larger variants
- Reduce image size before uploading

### Out of memory
- Switch to smaller model (`vit_b`)
- Use CPU instead of GPU for large images
- Reduce batch size in `sam_service.py`

## License

MIT

## Credits

- **Segment Anything Model**: Meta AI Research
- **Konva.js**: Canvas rendering library
- **React**: UI framework
- **Flask**: Python web framework
