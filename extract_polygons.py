#!/usr/bin/env python3
"""
Extract clean polygon points from SAM mask images using scikit-image.
Outputs SVG-ready polygon point strings for the 1024x768 viewBox.
"""

import os
from PIL import Image
import numpy as np
from skimage import measure
from scipy import ndimage

MASK_DIR = "masks"
OUTPUT_DIR = "masks"
VIEWBOX_WIDTH = 1024
VIEWBOX_HEIGHT = 768

# Map mask filenames to nice names for the HTML
MASK_MAPPING = {
    "door_mask.png": "door",
    "bartender_mask.png": "bartender",
    "patron1_mask.png": "patron1",
    "patron2_mask.png": "patron2",
    "bottle_mask.png": "counter",   # using bottle as proxy for counter area
}

def simplify_contour(contour, tolerance=2.5):
    """Simple polygon simplification (Douglas-Peucker like)."""
    if len(contour) < 4:
        return contour

    def perpendicular_distance(point, line_start, line_end):
        if np.all(line_start == line_end):
            return np.linalg.norm(point - line_start)
        return np.abs(np.cross(line_end - line_start, point - line_start) / np.linalg.norm(line_end - line_start))

    def douglas_peucker(points, eps):
        if len(points) <= 2:
            return points
        dmax = 0
        index = 0
        for i in range(1, len(points) - 1):
            d = perpendicular_distance(points[i], points[0], points[-1])
            if d > dmax:
                index = i
                dmax = d
        if dmax > eps:
            left = douglas_peucker(points[:index+1], eps)
            right = douglas_peucker(points[index:], eps)
            return np.vstack((left[:-1], right))
        else:
            return np.array([points[0], points[-1]])

    return douglas_peucker(contour, tolerance)

def extract_polygon_from_mask(mask_path, name, tolerance=2.8, min_area=400):
    """Extract the largest clean polygon from a SAM mask."""
    img = Image.open(mask_path).convert("L")
    mask = np.array(img)

    # Debug info
    print(f"{name}: max={mask.max()}, mean={mask.mean():.1f}")

    # SAM masks are often soft — use a relatively low threshold
    binary = mask > 40

    # Light morphological cleanup (closing)
    from scipy import ndimage
    binary = ndimage.binary_closing(binary, structure=np.ones((3,3)))

    # Find contours at level 0.5
    contours = measure.find_contours(binary.astype(float), 0.5)

    if not contours:
        print(f"  → No contours found")
        return None

    # Pick the largest contour by area
    best_contour = None
    best_area = 0

    for contour in contours:
        poly = np.array(contour)
        if len(poly) < 3:
            continue
        area = 0.5 * np.abs(np.sum(poly[:-1,0]*poly[1:,1] - poly[1:,0]*poly[:-1,1]))
        if area > best_area and area > min_area:
            best_area = area
            best_contour = poly

    if best_contour is None:
        print(f"  → No contour above min_area")
        return None

    # Simplify the contour
    simplified = simplify_contour(best_contour, tolerance)

    # Build SVG points (scikit-image uses (row=y, col=x))
    points = []
    for y, x in simplified:
        points.append(f"{x:.1f},{y:.1f}")

    polygon_str = " ".join(points)
    print(f"  → {len(simplified)} points (area≈{best_area:.0f})")
    return polygon_str

def main():
    results = {}

    for filename, nice_name in MASK_MAPPING.items():
        path = os.path.join(MASK_DIR, filename)
        if not os.path.exists(path):
            print(f"Missing: {filename}")
            continue

        poly = extract_polygon_from_mask(path, nice_name)
        if poly:
            results[nice_name] = poly

    # Print results in a format easy to copy into HTML
    print("\n" + "="*60)
    print("COPY THESE INTO THE HTML:")
    print("="*60)
    for name, poly in results.items():
        print(f'\n<!-- {name.upper()} -->')
        print(f'<polygon id="{name}" class="hotspot" points="{poly}" />')

if __name__ == "__main__":
    main()