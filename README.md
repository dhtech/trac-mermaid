# trac-mermaid

[Mermaid](https://mermaid.js.org) charts in [Trac](https://trac.edgewall.org) wiki pages.

A chart is written as text in the page:

```
{{{#!mermaid
flowchart TD
    A[Commit] --> B{Does it compile?}
    B -- yes --> C[Published]
    B -- no --> D[Refused]
}}}
```

and drawn in the reader's browser. The text stays in the page: it can be
edited like any other wiki text and shows up in the page's diffs.

- **Nothing is fetched from elsewhere.** Mermaid's script is part of the
  plugin and is served by Trac itself.
- **Only pages with a chart load it.** Every other page is as light as
  before.
- **Without JavaScript the reader sees the text** of the chart.
- **A chart is text and nothing else.** Labels are drawn as text, not as
  HTML: a tag written in a chart is shown as it was written and makes
  nothing happen (only `<br>` breaks a line). Mermaid runs with its
  strict security level: no scripts, no links that run anything. A
  chart cannot switch any of this off for itself: the settings are
  closed to the `%%{init}%%` line and the front matter a chart may
  carry. Its looks - the theme, the colours - it may still choose.
- **A chart Mermaid cannot read** stays as its text, with what Mermaid
  said about it underneath. So does every chart when Mermaid's script
  could not be loaded.
- A chart inside something folded away is drawn when it comes into view.
- On a page with a dark background the chart gets Mermaid's dark colours.

For Trac 1.6 (Python 3). Tried on Debian 13's `trac` package.

## Installing

A release is one archive, `trac-mermaid_<version>.tar.gz`, with

```
tracmermaid.py
tracmermaid_htdocs/mermaid.min.js
tracmermaid_htdocs/tracmermaid.js
tracmermaid_htdocs/MERMAID-LICENSE
```

Put `tracmermaid.py` and the directory `tracmermaid_htdocs` in the
`plugins` directory of the Trac environment and restart the web server.
A plugin there is enabled by itself; to switch it off, say so in
`trac.ini`:

```
[components]
tracmermaid.* = disabled
```

## What can be drawn

Everything the Mermaid version in the release can: flowcharts, sequence
diagrams, state diagrams, Gantt charts and more - see
[Mermaid's own documentation](https://mermaid.js.org/intro/). Which
Mermaid version a release carries is in its `VERSION` file and in
`mermaid.pin` here.

Not yet: the live preview of Trac's page editor shows a chart as its
text; it is drawn when the page is saved or previewed in full.

## Building

```
python3 -m pytest tests        # needs trac (Debian: apt install trac python3-pytest)
sh build.sh                    # needs curl, openssl, tar
sh tests/smoke.sh              # the built plugin in a real Trac; needs trac and curl
```

`build.sh` fetches the one Mermaid release that `mermaid.pin` names from
npm's registry, checks it against the checksum written there, and takes
Mermaid's browser file and its licence out of it. A newer Mermaid is a
change of the two lines in `mermaid.pin`.

The same commit gives the same archive, byte for byte: build a tag again
and compare with the release's `SHA256SUMS`.

A tag `vX.Y.Z` builds the release on GitHub; the number is the one in
`tracmermaid.py`.

## License

The plugin: GPL-3.0-or-later. Mermaid, which a release carries: MIT
(`tracmermaid_htdocs/MERMAID-LICENSE`).
