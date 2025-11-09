# SAM REST API

REST API for Meta's Segment Anything Model (SAM) image segmentation.

## Setup

### Prerequisites

- Python 3.8 or higher
- pip

### Installation

1. Create a virtual environment (recommended):
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

The SAM model (~375MB for vit_b) will be automatically downloaded on first use.

## Running the Server

```bash
python app.py
```

The server will start on `http://localhost:5001`

## API Endpoints

### GET /health

Check if the server is running and model is loaded.

**Response:**
```json
{
  "status": "ok",
  "model_loaded": true
}
```

### POST /segment

Segment an image using SAM.

**Request body:**
```json
{
  "image": "data:image/png;base64,...",  // Base64 encoded image
  "points": [                             // Optional: point prompts
    { "x": 100, "y": 150, "label": 1 }   // label: 1=foreground, 0=background
  ],
  "boxes": [                              // Optional: box prompts
    [x1, y1, x2, y2]
  ]
}
```

**Response:**
```json
{
  "segments": [
    {
      "id": "segment-123456",
      "maskData": "base64_encoded_mask",
      "maskShape": { "height": 1024, "width": 1024 },
      "bounds": { "x": 10, "y": 20, "width": 100, "height": 150 }
    }
  ]
}
```

## Modes

### 1. Automatic Segmentation
Send only the image (no points or boxes). SAM will automatically detect and segment all objects.

### 2. Point-based Segmentation
Send image with point prompts. Click on an object to segment it.

### 3. Box-based Segmentation
Send image with box coordinates to segment objects within the box.

## Model Variants

The default model is `vit_b` (smallest, fastest). To use a different model, modify `model_type` in `sam_service.py`:

- `vit_b`: ~375MB, fastest
- `vit_l`: ~1.2GB, better quality
- `vit_h`: ~2.4GB, best quality

## Performance

- First request will be slower as the model loads into memory
- GPU acceleration is automatic if CUDA is available
- Subsequent requests are much faster (model stays loaded)
