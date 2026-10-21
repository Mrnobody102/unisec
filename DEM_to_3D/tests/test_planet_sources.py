import json,sys,tempfile,unittest
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'tools'))
from planet_sources import discover_scenes,select_scene,read_scene

class PlanetSourcesTest(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory();self.root=Path(self.temp.name)
    def tearDown(self):self.temp.cleanup()
    def scene(self,folder,name,acquired,strip):
        path=self.root/'planet'/folder/name;path.parent.mkdir(parents=True,exist_ok=True);path.touch()
        path.with_name(path.stem.replace('_3B_Visual_clip','')+'_metadata.json').write_text(json.dumps({'properties':{'acquired':acquired,'strip_id':strip}}),encoding='utf8');return path
    def test_rejects_ambiguous_same_day_strips_instead_of_using_glob_order(self):
        folder='CheTao_RoadPart2_strip_psscene_visual'
        a=self.scene(folder,'a.tif','2026-07-03T03:00:00Z','1');self.scene(folder,'b.tif','2026-07-03T04:00:00Z','2')
        with self.assertRaisesRegex(ValueError,'found 2'):select_scene(self.root,'RoadPart2','2026-07-03')
        self.assertEqual(select_scene(self.root,'RoadPart2','2026-07-03','1').path,a)
        self.assertEqual(len(discover_scenes(self.root)),2)
    def test_reads_the_added_april_folder_and_uses_utc_metadata_not_the_filename(self):
        path=self.scene('CheTao_RoadPart1_strip_add_psscene_visual/PSScene','wrong-name_3B_Visual_clip.tif','2026-04-13T00:30:00+07:00','9')
        self.assertEqual(select_scene(self.root,'RoadPart1','2026-04-12').path,path)
        self.assertEqual(read_scene(path).day,'2026-04-12')
        self.assertEqual(len(discover_scenes(self.root)),1)
    def test_requires_acquisition_timezone(self):
        path=self.scene('CheTao_RoadPart2_strip_psscene_visual','a.tif','2026-04-12T03:00:00','1')
        with self.assertRaisesRegex(ValueError,'timezone'):read_scene(path)

if __name__=='__main__':unittest.main()
