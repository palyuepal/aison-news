from html.parser import HTMLParser
from pathlib import Path

class NewsletterParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.frames = []
        self.links = []
    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == 'iframe' and attrs.get('title') == 'AIson Morning Brief 訂閱表格':
            self.frames.append(attrs.get('src', ''))
        if tag == 'a':
            self.links.append(attrs.get('href', ''))

page = NewsletterParser()
page.feed(Path('index.html').read_text(encoding='utf-8'))
assert len(page.frames) == 1, 'Expected one titled Morning Brief form'
form = page.frames[0]
assert form.startswith('https://subscribe-forms.beehiiv.com/v3/forms/'), 'Unexpected newsletter form URL'
assert form in page.links, 'Newsletter fallback must link to the embedded form'
print('Homepage newsletter form and fallback match')
