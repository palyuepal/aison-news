import contextlib
import io
import json
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'tools'))
import check_deep_reads as gate
from read_time import format_read_time, read_minutes


class ReadTimeRegressionTests(unittest.TestCase):
    def test_valid_inputs_share_display_format(self):
        for value in (5, '5 分鐘', '5分鐘', ' 5 分鐘 '):
            with self.subTest(value=value):
                self.assertEqual(read_minutes(value), 5)
                self.assertEqual(format_read_time(value), '5 分鐘')

    def test_invalid_values_are_not_guessed(self):
        for value in (None, True, False, 0, -5, 5.0, '', '5',
                      '0 分鐘', '-5 分鐘', '1.5 分鐘', '約5分鐘',
                      '5 分鐘 garbage', [], {}):
            with self.subTest(value=value):
                self.assertIsNone(read_minutes(value))
                with self.assertRaises(ValueError):
                    format_read_time(value)

    def run_fixture(self, minutes=5, other_minutes=3):
        # Real failing edition; no invented article content or relaxed thresholds.
        root = Path(__file__).resolve().parents[1]
        stories = json.loads((root / 'content/daily/2026-10-14.json').read_text())
        editorial = json.loads((root / 'content/editorial/2026-10-14.json').read_text())
        for story in stories:
            story['readTime'] = minutes if story['id'] in editorial['top3Ids'] else other_minutes
        with tempfile.TemporaryDirectory() as tmp:
            daily = Path(tmp) / 'daily'
            meta = Path(tmp) / 'editorial'
            daily.mkdir()
            meta.mkdir()
            (daily / '2026-10-14.json').write_text(json.dumps(stories))
            (meta / '2026-10-14.json').write_text(json.dumps(editorial))
            output = io.StringIO()
            with patch.object(gate, 'DAILY_DIR', daily), patch.object(gate, 'EDITORIAL_DIR', meta), contextlib.redirect_stdout(output), contextlib.redirect_stderr(output):
                result = gate.main()
            return result, output.getvalue()

    def test_original_numeric_edition_passes(self):
        self.assertEqual(self.run_fixture()[0], 0)

    def test_eight_minutes_still_requires_deep_read(self):
        result, output = self.run_fixture(minutes=8)
        self.assertEqual(result, 1)
        self.assertIn('does not meet Deep Read thresholds', output)

    def test_non_featured_invalid_read_time_is_blocked(self):
        result, output = self.run_fixture(other_minutes=-3)
        self.assertEqual(result, 1)
        self.assertIn('readTime must be a positive integer', output)


if __name__ == '__main__':
    unittest.main()
