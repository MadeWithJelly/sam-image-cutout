import os
import io
import base64
import numpy as np
from flask import Flask, request, jsonify
from flask_cors import CORS
from PIL import Image
import cv2

from sam_service import SAMService

app = Flask(__name__)
CORS(app)

# Initialize SAM service
sam_service = None

def initialize_sam():
    global sam_service
    if sam_service is None:
        print("Initializing SAM model...")
        sam_service = SAMService()
        print("SAM model ready!")

@app.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'ok', 'model_loaded': sam_service is not None})

@app.route('/segment', methods=['POST'])
def segment():
    try:
        initialize_sam()

        data = request.json

        # Decode base64 image
        if 'image' not in data:
            return jsonify({'error': 'No image provided'}), 400

        image_data = base64.b64decode(data['image'].split(',')[1] if ',' in data['image'] else data['image'])
        image = Image.open(io.BytesIO(image_data))
        image_np = np.array(image.convert('RGB'))

        # Get prompt points (optional)
        points = data.get('points', None)
        boxes = data.get('boxes', None)

        # Set image in SAM
        sam_service.set_image(image_np)

        # Generate masks
        if points:
            # Point-based segmentation
            point_coords = np.array([[p['x'], p['y']] for p in points])
            point_labels = np.array([p.get('label', 1) for p in points])

            masks, scores = sam_service.predict(
                point_coords=point_coords,
                point_labels=point_labels
            )
        elif boxes:
            # Box-based segmentation
            box = np.array(boxes[0])  # Use first box for now
            masks, scores = sam_service.predict(box=box)
        else:
            # Automatic segmentation
            masks = sam_service.generate_masks()
            return jsonify({
                'segments': process_automatic_masks(masks, image_np.shape)
            })

        # Process and return best mask
        if len(masks) > 0:
            best_mask_idx = np.argmax(scores)
            mask = masks[best_mask_idx]

            return jsonify({
                'segments': [process_single_mask(mask, image_np.shape)]
            })

        return jsonify({'segments': []})

    except Exception as e:
        print(f"Error in segmentation: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

def process_single_mask(mask, image_shape):
    """Process a single mask and extract its properties"""
    mask_uint8 = (mask * 255).astype(np.uint8)

    # Find bounding box
    coords = np.argwhere(mask)
    if len(coords) == 0:
        return None

    y_min, x_min = coords.min(axis=0)
    y_max, x_max = coords.max(axis=0)

    # Encode mask as base64
    mask_encoded = base64.b64encode(mask_uint8.tobytes()).decode('utf-8')

    return {
        'id': f'segment-{np.random.randint(0, 1000000)}',
        'maskData': mask_encoded,
        'maskShape': {'height': mask.shape[0], 'width': mask.shape[1]},
        'bounds': {
            'x': int(x_min),
            'y': int(y_min),
            'width': int(x_max - x_min + 1),
            'height': int(y_max - y_min + 1)
        }
    }

def process_automatic_masks(masks_data, image_shape):
    """Process automatic segmentation masks"""
    segments = []

    # Sort by area (largest first) and limit to top 15
    sorted_masks = sorted(masks_data, key=lambda x: x['area'], reverse=True)[:15]

    for mask_info in sorted_masks:
        mask = mask_info['segmentation']
        segment = process_single_mask(mask, image_shape)
        if segment:
            segments.append(segment)

    return segments

if __name__ == '__main__':
    # Create models directory
    os.makedirs('models', exist_ok=True)

    print("Starting SAM REST API...")
    print("Model will be downloaded on first request if not present")

    app.run(host='0.0.0.0', port=5001, debug=True)

