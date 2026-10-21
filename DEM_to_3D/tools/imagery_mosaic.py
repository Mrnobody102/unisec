"""Blend only overlapping valid pixels on one north-up, aligned optical grid.

This is a display mosaic: no extrapolation, cloud removal or radiometric analysis.
"""
import numpy as np
from affine import Affine


def optical_mosaic(parts, feather_pixels=20):
    if not parts:
        raise ValueError('An optical mosaic requires source pixels')
    resolution = parts[0][1].a
    if resolution <= 0:
        raise ValueError('An optical mosaic requires north-up source pixels')
    for rgba, transform in parts:
        if rgba.shape[0] != 4 or transform.b or transform.d or transform.a != resolution or transform.e != -resolution:
            raise ValueError('Optical inputs must share a north-up pixel grid')
    left = min(t.c for _, t in parts)
    top = max(t.f for _, t in parts)
    right = max(t.c + rgba.shape[2]*resolution for rgba, t in parts)
    bottom = min(t.f - rgba.shape[1]*resolution for rgba, t in parts)
    width, height = round((right-left)/resolution), round((top-bottom)/resolution)
    weights = np.zeros((height, width), dtype=np.float32)
    rgb = np.zeros((3, height, width), dtype=np.float32)
    for rgba, transform in parts:
        x, y = (transform.c-left)/resolution, (top-transform.f)/resolution
        if abs(x-round(x)) > 1e-6 or abs(y-round(y)) > 1e-6:
            raise ValueError('Optical source pixels are not aligned')
        x, y = round(x), round(y)
        h, w = rgba.shape[1:]
        edge_x = np.minimum(np.arange(w)+1, w-np.arange(w))[None, :]
        edge_y = np.minimum(np.arange(h)+1, h-np.arange(h))[:, None]
        weight = np.minimum(np.minimum(edge_x, edge_y), max(1, feather_pixels)).astype(np.float32)
        weight *= rgba[3]/255
        weights[y:y+h, x:x+w] += weight
        rgb[:, y:y+h, x:x+w] += rgba[:3]*weight
    result = np.zeros((4, height, width), dtype=np.uint8)
    valid = weights > 0
    result[:3, valid] = np.rint(rgb[:, valid]/weights[valid]).clip(0,255).astype(np.uint8)
    result[3, valid] = 255
    return result, Affine(resolution, 0, left, 0, -resolution, top)
