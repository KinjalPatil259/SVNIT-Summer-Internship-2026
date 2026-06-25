"""
EquationAI — Handwriting Image Preprocessor
Cleans up canvas images for optimal OCR recognition.

The pix2tex model was trained on clean, high-contrast printed equations.
Raw handwritten canvas images need significant preprocessing to match
what the model expects:
  1. Remove transparency (flatten to white background)
  2. Convert to grayscale
  3. Binarize with adaptive thresholding (clean strokes)
  4. Auto-crop to content area with padding
  5. Resize to optimal dimensions for pix2tex
  6. Add white border padding
"""

import numpy as np
from PIL import Image, ImageOps, ImageFilter
from app.core.logging_config import get_logger

logger = get_logger("handwriting_preprocessor")

# ── Configuration ──
MIN_CONTENT_SIZE = 20        # Minimum pixel dimension to consider as content
CROP_PADDING = 40            # Padding around cropped content (pixels)
TARGET_HEIGHT = 200          # Target image height for OCR model
BINARIZE_THRESHOLD = 180     # Grayscale threshold (0-255) for binarization
BORDER_PADDING = 30          # White border added after resize


def preprocess_handwriting(image: Image.Image) -> Image.Image:
    """
    Full preprocessing pipeline for handwritten canvas images.
    Transforms raw canvas output into a clean, high-contrast image
    suitable for the pix2tex OCR model.
    """
    logger.info(f"Preprocessing handwriting image: {image.size}, mode={image.mode}")

    # ── Step 1: Flatten transparency to white background ──
    image = _flatten_alpha(image)

    # ── Step 2: Convert to grayscale ──
    gray = image.convert("L")

    # ── Step 3: Invert if needed (ensure dark strokes on white bg) ──
    gray = _ensure_dark_on_white(gray)

    # ── Step 4: Binarize (clean up noisy strokes) ──
    binary = _binarize(gray)

    # ── Step 5: Remove noise (small isolated dots) ──
    binary = _remove_noise(binary)

    # ── Step 6: Auto-crop to content bounding box ──
    cropped = _auto_crop(binary)
    if cropped is None:
        logger.warning("No content detected in canvas — returning original")
        return image

    # ── Step 7: Resize to optimal height while maintaining aspect ratio ──
    resized = _resize_to_target(cropped)

    # ── Step 8: Add white border padding ──
    padded = ImageOps.expand(resized, border=BORDER_PADDING, fill=255)

    # ── Step 9: Convert back to RGB for OCR model ──
    result = padded.convert("RGB")

    logger.info(f"Preprocessing complete: {image.size} → {result.size}")
    return result


def _flatten_alpha(image: Image.Image) -> Image.Image:
    """Remove transparency by compositing onto a white background."""
    if image.mode == "RGBA":
        background = Image.new("RGBA", image.size, (255, 255, 255, 255))
        background.paste(image, mask=image.split()[3])  # Use alpha channel as mask
        return background.convert("RGB")
    elif image.mode != "RGB":
        return image.convert("RGB")
    return image


def _ensure_dark_on_white(gray: Image.Image) -> Image.Image:
    """
    Ensure the image has dark strokes on a white background.
    If the image is mostly dark (inverted), flip it.
    """
    arr = np.array(gray)
    mean_val = arr.mean()

    # If mean is low (< 128), the background is dark — invert
    if mean_val < 128:
        logger.info(f"Image appears inverted (mean={mean_val:.0f}), flipping")
        return ImageOps.invert(gray)

    return gray


def _binarize(gray: Image.Image) -> Image.Image:
    """
    Apply thresholding to create a clean black-and-white image.
    Pixels darker than threshold → black (0), rest → white (255).
    """
    arr = np.array(gray)

    # Apply threshold: anything darker than BINARIZE_THRESHOLD becomes black
    binary_arr = np.where(arr < BINARIZE_THRESHOLD, 0, 255).astype(np.uint8)

    return Image.fromarray(binary_arr, mode="L")


def _remove_noise(binary: Image.Image) -> Image.Image:
    """
    Remove small noise particles (isolated pixels/dots).
    Uses morphological operations via a median filter.
    """
    # Median filter removes salt-and-pepper noise
    filtered = binary.filter(ImageFilter.MedianFilter(size=3))
    return filtered


def _auto_crop(binary: Image.Image) -> Image.Image:
    """
    Crop to the bounding box of the actual content (ink strokes).
    Returns None if no content is detected.
    """
    arr = np.array(binary)

    # Find all dark pixels (content = 0 in binary image)
    dark_pixels = np.where(arr < 128)

    if len(dark_pixels[0]) == 0 or len(dark_pixels[1]) == 0:
        return None  # No content

    # Get bounding box
    top = dark_pixels[0].min()
    bottom = dark_pixels[0].max()
    left = dark_pixels[1].min()
    right = dark_pixels[1].max()

    # Check minimum content size
    content_height = bottom - top
    content_width = right - left
    if content_height < MIN_CONTENT_SIZE or content_width < MIN_CONTENT_SIZE:
        logger.warning(f"Content too small: {content_width}x{content_height}")
        return None

    # Add padding (clamp to image bounds)
    h, w = arr.shape
    top = max(0, top - CROP_PADDING)
    bottom = min(h - 1, bottom + CROP_PADDING)
    left = max(0, left - CROP_PADDING)
    right = min(w - 1, right + CROP_PADDING)

    cropped = binary.crop((left, top, right + 1, bottom + 1))
    logger.info(f"Auto-cropped to content: {cropped.size}")
    return cropped


def _resize_to_target(image: Image.Image) -> Image.Image:
    """
    Resize image to TARGET_HEIGHT while maintaining aspect ratio.
    Uses high-quality Lanczos resampling.
    """
    w, h = image.size
    if h <= 0:
        return image

    aspect_ratio = w / h
    new_height = TARGET_HEIGHT
    new_width = int(new_height * aspect_ratio)

    # Ensure minimum width
    new_width = max(new_width, TARGET_HEIGHT)

    resized = image.resize((new_width, new_height), Image.LANCZOS)
    return resized
