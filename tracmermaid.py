# SPDX-License-Identifier: GPL-3.0-or-later
"""Mermaid charts in Trac wiki pages.

A chart is written as text in a wiki page:

    {{{#!mermaid
    flowchart TD
        A[Commit] --> B[Published]
    }}}

and drawn in the reader's browser by Mermaid (https://mermaid.js.org),
which this plugin serves itself - nothing is fetched from elsewhere.
Without JavaScript the reader sees the text.

One file, for the plugins directory of a Trac environment, with the
directory tracmermaid_htdocs beside it.
"""
import os

from trac.core import Component, implements
from trac.util.html import tag
from trac.web.chrome import ITemplateProvider, add_script
from trac.wiki.api import IWikiMacroProvider

__version__ = '0.1.0'

# what the browser asks for: /chrome/tracmermaid/<file>
PREFIX = 'tracmermaid'
HTDOCS = os.path.join(os.path.dirname(os.path.abspath(__file__)),
                      'tracmermaid_htdocs')


class MermaidMacro(Component):
    """The wiki processor `mermaid`: its text is a Mermaid chart."""

    implements(IWikiMacroProvider, ITemplateProvider)

    # IWikiMacroProvider

    def get_macros(self):
        yield 'mermaid'

    def get_macro_description(self, name):
        return ('A chart, written as [https://mermaid.js.org Mermaid] text '
                'and drawn in the browser:\n'
                '{{{\n{{{#!mermaid\nflowchart TD\n    A[Start] --> B[End]\n'
                '}}}\n}}}\n')

    def is_inline(self, content):
        return False

    def expand_macro(self, formatter, name, content, args=None):
        # The text goes out as text - escaped, never as markup. The
        # browser's script reads it from there; a reader without
        # JavaScript reads it as it stands.
        req = getattr(formatter, 'req', None)
        if req is not None:
            add_script(req, PREFIX + '/mermaid.min.js')
            add_script(req, PREFIX + '/tracmermaid.js')
        return tag.pre(content or '', class_='mermaid')

    # ITemplateProvider

    def get_htdocs_dirs(self):
        return [(PREFIX, HTDOCS)]

    def get_templates_dirs(self):
        return []
