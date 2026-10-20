"""Colour-fit regression with a known curve and excluded cloud/shadow samples."""
import sys,unittest
from pathlib import Path
import numpy as np
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'tools'))
from prepare_basemap_tone import fit_tone

class BasemapToneTests(unittest.TestCase):
    def test_recovers_a_known_monotone_display_curve_without_cloud_or_shadow_bias(self):
        rng=np.random.default_rng(42)
        g=rng.uniform(55,140,(100,100));source=np.stack([g*.65,g,g*.5],axis=-1)
        gamma=np.array([1.1,1.2,1.05]);target=255*np.power(source/255,gamma)
        source[:15]=255;target[:15]=0
        fit=fit_tone(source,target,np.ones((100,100),dtype=bool))
        np.testing.assert_allclose(fit['gamma'],gamma,atol=.03)
        self.assertGreater(fit['samples'],500)
        self.assertLess(fit['medianCanopyDifferenceAfter'],fit['medianCanopyDifferenceBefore'])
    def test_refuses_to_fit_an_empty_or_cloud_only_overlap(self):
        image=np.full((100,100,3),255,dtype=np.uint8)
        with self.assertRaisesRegex(ValueError,'Insufficient'):
            fit_tone(image,image,np.ones((100,100),dtype=bool))

if __name__=='__main__':unittest.main()
