"""Exercise CLI browser selection without requiring a browser or Playwright installation."""
import runpy
import sys
import types
import unittest
from pathlib import Path
from unittest.mock import MagicMock, patch


class StopAtLaunch(RuntimeError):
    pass


class BrowserCliTests(unittest.TestCase):
    def launch_options(self, script_name, *arguments):
        script = Path(__file__).with_name(script_name)
        playwright = types.ModuleType('playwright')
        api = types.ModuleType('playwright.sync_api')
        api.expect = MagicMock()
        api.sync_playwright = MagicMock()
        browser_type = api.sync_playwright.return_value.__enter__.return_value.chromium
        browser_type.launch.side_effect = StopAtLaunch
        with patch.dict(sys.modules, {'playwright': playwright, 'playwright.sync_api': api}), patch.object(sys, 'argv', [str(script), '--url', 'http://127.0.0.1:5213', *arguments]):
            with self.assertRaises(StopAtLaunch):
                runpy.run_path(str(script), run_name='__main__')
        return browser_type.launch.call_args.kwargs

    def test_ci_uses_playwright_browser_without_a_machine_specific_path(self):
        for script in ['check_gis_draft_publish.py', 'check_field_observations.py', 'check_map_tools.py', 'check_point_modes.py']:
            with self.subTest(script=script):
                options = self.launch_options(script)
                self.assertTrue(options['headless'])
                self.assertIsNone(options.get('executable_path'))

    def test_explicit_browser_override_is_preserved(self):
        browser = '/custom/chromium'
        self.assertEqual(self.launch_options('check_gis_draft_publish.py', '--chrome', browser)['executable_path'], browser)


if __name__ == '__main__':
    unittest.main()
