import os
import urllib.request
import torch
import numpy as np
from segment_anything import sam_model_registry, SamPredictor, SamAutomaticMaskGenerator

class SAMService:
    def __init__(self, model_type='vit_b'):
        self.model_type = model_type
        self.device = 'cuda' if torch.cuda.is_available() else 'cpu'
        print(f"Using device: {self.device}")

        # Model paths
        self.model_dir = 'models'
        self.model_paths = {
            'vit_b': os.path.join(self.model_dir, 'sam_vit_b_01ec64.pth'),
            'vit_l': os.path.join(self.model_dir, 'sam_vit_l_0b3195.pth'),
            'vit_h': os.path.join(self.model_dir, 'sam_vit_h_4b8939.pth'),
        }

        # Model URLs
        self.model_urls = {
            'vit_b': 'https://dl.fbaipublicfiles.com/segment_anything/sam_vit_b_01ec64.pth',
            'vit_l': 'https://dl.fbaipublicfiles.com/segment_anything/sam_vit_l_0b3195.pth',
            'vit_h': 'https://dl.fbaipublicfiles.com/segment_anything/sam_vit_h_4b8939.pth',
        }

        os.makedirs(self.model_dir, exist_ok=True)

        # Download model if needed
        self._ensure_model_downloaded()

        # Load model
        self.sam = sam_model_registry[self.model_type](
            checkpoint=self.model_paths[self.model_type]
        )
        self.sam.to(device=self.device)

        # Initialize predictor and mask generator
        self.predictor = SamPredictor(self.sam)
        self.mask_generator = SamAutomaticMaskGenerator(
            self.sam,
            points_per_side=32,
            pred_iou_thresh=0.86,
            stability_score_thresh=0.92,
            crop_n_layers=1,
            crop_n_points_downscale_factor=2,
            min_mask_region_area=100,
        )

        self.current_image = None

    def _ensure_model_downloaded(self):
        """Download model if it doesn't exist"""
        model_path = self.model_paths[self.model_type]

        if os.path.exists(model_path):
            print(f"Model already exists at {model_path}")
            return

        model_url = self.model_urls[self.model_type]
        print(f"Downloading {self.model_type} model from {model_url}")
        print("This may take several minutes (~375MB for vit_b)...")

        def download_progress(block_num, block_size, total_size):
            downloaded = block_num * block_size
            percent = min(100, downloaded * 100 / total_size)
            print(f"\rDownload progress: {percent:.1f}%", end='')

        urllib.request.urlretrieve(
            model_url,
            model_path,
            reporthook=download_progress
        )
        print("\nModel downloaded successfully!")

    def set_image(self, image_np):
        """Set the image for segmentation (numpy array in RGB format)"""
        self.current_image = image_np
        self.predictor.set_image(image_np)

    def predict(self, point_coords=None, point_labels=None, box=None, multimask_output=True):
        """
        Predict masks for given prompts

        Args:
            point_coords: Nx2 array of point coordinates
            point_labels: N array of point labels (1 = foreground, 0 = background)
            box: Array of box coordinates [x1, y1, x2, y2]
            multimask_output: Whether to return multiple masks

        Returns:
            masks: Array of predicted masks
            scores: Array of mask quality scores
        """
        masks, scores, logits = self.predictor.predict(
            point_coords=point_coords,
            point_labels=point_labels,
            box=box,
            multimask_output=multimask_output
        )

        return masks, scores

    def generate_masks(self):
        """
        Generate masks automatically for the entire image

        Returns:
            List of dictionaries with mask data
        """
        if self.current_image is None:
            raise ValueError("No image set. Call set_image() first.")

        masks = self.mask_generator.generate(self.current_image)
        return masks

    def predict_from_points(self, points):
        """
        Convenience method to predict from list of point dicts

        Args:
            points: List of dicts with 'x', 'y', and optional 'label' keys

        Returns:
            masks: Array of predicted masks
            scores: Array of mask quality scores
        """
        point_coords = np.array([[p['x'], p['y']] for p in points])
        point_labels = np.array([p.get('label', 1) for p in points])

        return self.predict(
            point_coords=point_coords,
            point_labels=point_labels
        )
