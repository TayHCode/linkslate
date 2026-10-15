import shutil
import subprocess
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


class NodeSuiteTest(unittest.TestCase):
    @unittest.skipUnless(shutil.which('node'), 'Node.js is not installed; skipping Node test suite.')
    def test_node_test_suite(self):
        result = subprocess.run(
            ['node', '--test', 'test/'],
            cwd=ROOT,
            capture_output=True,
            text=True,
        )
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
