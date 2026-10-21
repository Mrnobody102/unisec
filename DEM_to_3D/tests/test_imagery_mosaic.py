"""The display mosaic must not create coverage or darken valid single-source pixels."""
import sys
import unittest
from pathlib import Path
import numpy as np
from affine import Affine
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'tools'))
from imagery_mosaic import optical_mosaic


class OpticalMosaicTests(unittest.TestCase):
    def test_valid_pixels_blend_only_in_overlap_and_missing_pixels_stay_empty(self):
        a=np.full((4,4,4),255,dtype=np.uint8);a[:3]=40
        b=a.copy();b[:3]=120
        # Overlap is two columns; a's north-west pixel is real NoData.
        a[:,0,0]=0
        result, transform=optical_mosaic([(a,Affine(3,0,0,0,-3,12)),(b,Affine(3,0,6,0,-3,12))],2)
        self.assertEqual(result.shape,(4,4,6))
        self.assertEqual(transform,Affine(3,0,0,0,-3,12))
        self.assertEqual(int(result[3,0,0]),0)
        self.assertEqual(int(result[0,2,1]),40)
        self.assertEqual(int(result[0,2,5]),120)
        self.assertTrue(40 < result[0,2,2] < 120)
        self.assertTrue(np.all(result[3,1:]==255))

    def test_rejects_unaligned_sources_instead_of_shifting_them(self):
        image=np.full((4,2,2),255,dtype=np.uint8)
        with self.assertRaisesRegex(ValueError,'aligned'):
            optical_mosaic([(image,Affine(3,0,0,0,-3,6)),(image,Affine(3,0,1,0,-3,6))])

if __name__=='__main__':
    unittest.main()
