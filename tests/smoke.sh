#!/bin/sh
# The built plugin in a real Trac, as a wiki would have it. Run after
# build.sh, on a machine with trac and curl (Debian: apt install trac):
#
#   sh tests/smoke.sh
#
# A new Trac environment gets the release's files in its plugins
# directory and one page with a chart; Trac's own small web server
# serves it; and the page is asked for the way a browser would.
set -eu
cd "$(dirname "$0")/.."
archive=$(ls dist/trac-mermaid_*.tar.gz)
work=$(mktemp -d)
trap 'kill "$pid" 2>/dev/null || true; rm -rf "${work:?}"' EXIT
pid=

trac-admin "$work/env" initenv Test sqlite:db/trac.db >/dev/null
tar -xzf "$archive" -C "$work"
cp -r "$work"/trac-mermaid_*/tracmermaid.py "$work"/trac-mermaid_*/tracmermaid_htdocs \
    "$work/env/plugins/"
cat >> "$work/env/conf/trac.ini" <<'INI'

[components]
tracmermaid.* = enabled
INI
printf 'A chart:\n\n{{{#!mermaid\nflowchart TD\n    A[Commit] --> B[Published]\n}}}\n' \
    > "$work/page.txt"
trac-admin "$work/env" wiki import ChartTest "$work/page.txt" >/dev/null

port=${SMOKE_PORT:-8765}
tracd --port "$port" --hostname 127.0.0.1 --single-env "$work/env" \
    > "$work/tracd.log" 2>&1 &
pid=$!
n=0
until curl -fsS -o "$work/page.html" "http://127.0.0.1:$port/wiki/ChartTest" 2>/dev/null; do
    n=$((n + 1))
    [ "$n" -le 100 ] || { echo "Trac did not answer"; cat "$work/tracd.log"; exit 1; }
    sleep 0.2
done

grep -q '<pre class="mermaid">' "$work/page.html"
grep -q 'A\[Commit\] --&gt; B\[Published\]' "$work/page.html"
grep -q 'chrome/tracmermaid/mermaid.min.js' "$work/page.html"
grep -q 'chrome/tracmermaid/tracmermaid.js' "$work/page.html"
# mermaid first: our script uses it
first=$(grep -o 'chrome/tracmermaid/[a-z.]*js' "$work/page.html" | head -1)
[ "$first" = chrome/tracmermaid/mermaid.min.js ]
curl -fsS -o "$work/m.js" "http://127.0.0.1:$port/chrome/tracmermaid/mermaid.min.js"
[ "$(wc -c < "$work/m.js")" -gt 1000000 ]
curl -fsS -o "$work/t.js" "http://127.0.0.1:$port/chrome/tracmermaid/tracmermaid.js"
cmp -s "$work/t.js" tracmermaid_htdocs/tracmermaid.js
# a page without a chart does not carry the 5 MB
curl -fsS -o "$work/start.html" "http://127.0.0.1:$port/wiki/WikiStart"
if grep -q tracmermaid "$work/start.html"; then
    echo "a page without a chart asks for the scripts"; exit 1
fi
echo "smoke: ok (Trac $(trac-admin --version | cut -d' ' -f2), $(cat "$work"/trac-mermaid_*/VERSION | tr '\n' ' '))"
if [ -n "${SMOKE_HOLD:-}" ]; then
    echo "holding Trac on port $port for $SMOKE_HOLD s"
    sleep "$SMOKE_HOLD"
fi
