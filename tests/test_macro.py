# SPDX-License-Identifier: GPL-3.0-or-later
"""The macro, in Trac's own test environment (no web server, no browser)."""
import importlib.util
import os
import re
import sys

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
spec = importlib.util.spec_from_file_location(
    'tracmermaid', os.path.join(HERE, 'tracmermaid.py'))
tracmermaid = importlib.util.module_from_spec(spec)
sys.modules['tracmermaid'] = tracmermaid
spec.loader.exec_module(tracmermaid)

from trac.test import EnvironmentStub, MockRequest  # noqa: E402
from trac.web.chrome import web_context  # noqa: E402
from trac.wiki.formatter import format_to_html  # noqa: E402

CHART = '{{{#!mermaid\nflowchart TD\n    A[Commit] --> B[Published]\n}}}\n'


def render(text):
    env = EnvironmentStub(enable=['trac.*', 'tracmermaid.*'])
    req = MockRequest(env)
    html = str(format_to_html(env, web_context(req, 'wiki', 'Page'), text))
    return html, req


def scripts(req):
    """The script files the page asks for, in order."""
    return [s['attrs']['src'] for s in req.chrome.get('scripts', [])]


def test_a_chart_goes_out_as_its_text():
    html, _ = render(CHART)
    assert '<pre class="mermaid">' in html
    # what the browser's script - or a reader without one - reads
    assert 'flowchart TD' in html
    assert 'A[Commit] --&gt; B[Published]' in html


def test_the_page_asks_for_mermaid_and_then_for_our_script():
    _, req = render(CHART)
    ours = [s for s in scripts(req) if '/tracmermaid/' in s]
    assert [s.rsplit('/', 1)[1] for s in ours] == ['mermaid.min.js',
                                                   'tracmermaid.js']
    assert all('/chrome/tracmermaid/' in s for s in ours)


def test_two_charts_ask_for_the_scripts_once():
    _, req = render(CHART + '\nsome text\n\n' + CHART)
    ours = [s for s in scripts(req) if '/tracmermaid/' in s]
    assert len(ours) == 2


def test_a_page_without_a_chart_asks_for_nothing_of_ours():
    html, req = render('Just a page.\n')
    assert 'mermaid' not in html
    assert not [s for s in scripts(req) if '/tracmermaid/' in s]


def test_markup_in_a_chart_stays_text():
    html, _ = render('{{{#!mermaid\nflowchart TD\n'
                     '    A["<script>alert(1)</script>"] --> B\n}}}\n')
    assert '<script>alert(1)</script>' not in html
    assert '&lt;script&gt;alert(1)&lt;/script&gt;' in html
    # and nothing of it has become an element of the page
    inside = re.search(r'<pre class="mermaid">(.*?)</pre>', html, re.S)
    assert inside and '<' not in inside.group(1)


def test_wiki_markup_in_a_chart_is_not_formatted():
    html, _ = render("{{{#!mermaid\nflowchart TD\n    A['''bold'''] --> "
                     "B[WikiStart]\n}}}\n")
    assert "'''bold'''" in html
    assert '<strong>' not in html and 'href' not in html


def test_an_empty_chart_is_an_empty_block():
    html, _ = render('{{{#!mermaid\n}}}\n')
    assert '<pre class="mermaid"></pre>' in html


def test_the_plugin_serves_its_own_files():
    env = EnvironmentStub(enable=['trac.*', 'tracmermaid.*'])
    dirs = dict(tracmermaid.MermaidMacro(env).get_htdocs_dirs())
    assert list(dirs) == ['tracmermaid']
    assert os.path.isfile(os.path.join(dirs['tracmermaid'], 'tracmermaid.js'))
    assert tracmermaid.MermaidMacro(env).get_templates_dirs() == []


def test_the_version_is_three_numbers():
    assert re.fullmatch(r'\d+\.\d+\.\d+', tracmermaid.__version__)


def test_the_pin_names_one_mermaid_release():
    pin = dict(line.split('=', 1) for line in
               open(os.path.join(HERE, 'mermaid.pin')).read().splitlines()
               if line and not line.startswith('#'))
    assert re.fullmatch(r'\d+\.\d+\.\d+', pin['version'])
    assert pin['integrity'].startswith('sha512-')
