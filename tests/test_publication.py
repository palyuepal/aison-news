import copy
import json
from pathlib import Path
import sys
import tempfile
import unittest
from datetime import datetime
from zoneinfo import ZoneInfo
from unittest.mock import patch
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'tools'))
import publication as p
import check_freshness as f
import check_live_publish as live

class PublicationTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.date = '2026-11-20'
        for kind in ('daily', 'editorial'):
            dest = self.root / 'content' / kind
            dest.mkdir(parents=True)
            (dest / (self.date+'.json')).write_bytes((p.ROOT / 'content' / kind / (self.date+'.json')).read_bytes())

    def test_missing_pair_fails(self):
        (self.root/'content/editorial'/f'{self.date}.json').unlink()
        with self.assertRaises(FileNotFoundError): p.receipt(self.date, self.root)

    def test_valid_ten_and_smaller_editorial_editions(self):
        self.assertEqual(p.receipt(self.date,self.root)['storyCount'],10)
        file=self.root/'content/daily'/f'{self.date}.json'
        file.write_text(json.dumps(json.loads(file.read_text())[:6]))
        self.assertEqual(p.receipt(self.date,self.root)['storyCount'],6)

    def test_invalid_rank_date_top3_and_unverified_fail(self):
        daily=self.root/'content/daily'/f'{self.date}.json'
        original=json.loads(daily.read_text())
        for key,value in [('rank',2),('date','2026-11-19'),('verified',False),('sourceUrl','http://bad')]:
            rows=copy.deepcopy(original); rows[0][key]=value
            daily.write_text(json.dumps(rows))
            with self.assertRaises((ValueError,SystemExit)): p.receipt(self.date,self.root)
        daily.write_text(json.dumps(original))
        meta=self.root/'content/editorial'/f'{self.date}.json'
        obj=json.loads(meta.read_text());obj['top3Ids'][0]='unknown'
        meta.write_text(json.dumps(obj))
        with self.assertRaises(SystemExit): p.receipt(self.date,self.root)

    def test_due_boundary_and_delayed_start(self):
        for hour,expected in [(7,'2026-11-19'),(8,'2026-11-20'),(23,'2026-11-20')]:
            self.assertEqual(p.due_date(datetime(2026,11,20,hour,tzinfo=ZoneInfo('Asia/Hong_Kong'))),expected)

    def test_same_ids_changed_copy_does_not_verify(self):
        rows=json.loads((self.root/'content/daily'/f'{self.date}.json').read_text())
        responses=['window.AISON_STATUS = {"editionDate":"2026-11-20"};',
                   'window.AISON_NEWS = '+json.dumps(rows)+';',
                   json.dumps({'editionDate':self.date,'dailySha256':'wrong'})]
        with patch.object(f,'ROOT',self.root), patch.object(f,'DAILY_DIR',self.root/'content/daily'), patch.object(f,'fetch_text',side_effect=responses):
            ok,message=f.validate_live(self.date)
        self.assertFalse(ok);self.assertIn('receipt differs',message)

    def test_public_receipt_and_artifact_hashes(self):
        import hashlib
        rows=json.loads((self.root/'content/daily'/f'{self.date}.json').read_text())
        artifacts={name: name+' content' for name in ('data/latest.js','data/editorial.js','index.html','daily.html')}
        published=p.receipt(self.date,self.root)
        published['artifacts']={name:hashlib.sha256(text.encode()).hexdigest() for name,text in artifacts.items()}
        responses=['window.AISON_STATUS = {"editionDate":"2026-11-20"};',
                   'window.AISON_NEWS = '+json.dumps(rows)+';',json.dumps(published),*artifacts.values()]
        for tamper in (False,True):
            data=responses.copy()
            if tamper: data[-1]='stale landing page'
            with patch.object(f,'ROOT',self.root),patch.object(f,'DAILY_DIR',self.root/'content/daily'),patch.object(f,'fetch_text',side_effect=data):
                ok,message=f.validate_live(self.date)
            self.assertEqual(ok,not tamper,message)

    def test_default_monitor_date_uses_due_edition_before_0800(self):
        with patch.object(p,'due_date',return_value='2026-11-19'), \
             patch.object(f,'hk_today',return_value='2026-11-20',create=True), \
             patch.object(f,'validate_source',return_value=(True,'ok')) as validate, \
             patch.object(sys,'argv',['check_freshness','--source-only']):
            f.main()
        validate.assert_called_once_with('2026-11-19')

    def test_live_detects_changed_body_link_and_active_flag(self):
        row={'id':'test','publishedAt':'2026-11-20T08:00:00+08:00','title':'same',
             'summary':'current facts','sourceUrl':'https://example.com/source','active':True}
        for key,value in [('summary','outdated facts'),('sourceUrl','https://example.com/old'),('active',False)]:
            changed=dict(row); changed[key]=value
            with self.subTest(key=key):
                self.assertNotEqual(live.signature([row]),live.signature([changed]))

    def test_network_failure_never_reports_live_success(self):
        with patch.object(live,'items_from_source',return_value=[]), patch.object(live,'items_from_public',side_effect=OSError('offline')), patch.object(sys,'argv',['check_live_publish']):
            with self.assertRaises(SystemExit): live.main()

if __name__=='__main__': unittest.main()
