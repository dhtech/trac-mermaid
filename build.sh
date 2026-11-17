#!/bin/sh
# Builds what a release carries, into dist/:
#
#   trac-mermaid_<version>.tar.gz   the plugin with Mermaid in it
#   SHA256SUMS
#
#   sh build.sh
#
# The version is the plugin's own (__version__ in tracmermaid.py).
# Mermaid is fetched from npm's registry - the one release mermaid.pin
# names, checked against the checksum written there - and only its one
# browser file and its licence are taken out of the package.
# Needs curl, openssl, tar, gzip.
#
# The same source gives the same archive, byte for byte: the files in it
# are sorted, carry the time of the commit they were built from, and the
# compression writes no time of its own. So anybody can build a tag
# again and compare with the release's SHA256SUMS.
set -eu
cd "$(dirname "$0")"

version=$(sed -n "s/^__version__ = '\([0-9][0-9.]*\)'$/\1/p" tracmermaid.py)
mermaid=$(sed -n 's/^version=//p' mermaid.pin)
integrity=$(sed -n 's/^integrity=sha512-//p' mermaid.pin)
[ -n "$version" ] && [ -n "$mermaid" ] && [ -n "$integrity" ] || {
    echo "the version or the pin could not be read"; exit 1; }

rm -rf build dist
mkdir -p build/npm dist
curl -fsSL -o build/mermaid.tgz \
    "https://registry.npmjs.org/mermaid/-/mermaid-${mermaid}.tgz"
got=$(openssl dgst -sha512 -binary build/mermaid.tgz | openssl base64 -A)
if [ "$got" != "$integrity" ]; then
    echo "mermaid ${mermaid}: the package is not the one mermaid.pin names"
    exit 1
fi
tar -xzf build/mermaid.tgz -C build/npm \
    package/dist/mermaid.min.js package/LICENSE

name="trac-mermaid_${version}"
mkdir -p "build/${name}/tracmermaid_htdocs"
cp tracmermaid.py LICENSE README.md "build/${name}/"
cp tracmermaid_htdocs/tracmermaid.js "build/${name}/tracmermaid_htdocs/"
cp build/npm/package/dist/mermaid.min.js "build/${name}/tracmermaid_htdocs/"
cp build/npm/package/LICENSE "build/${name}/tracmermaid_htdocs/MERMAID-LICENSE"
printf 'trac-mermaid %s\nmermaid %s\n' "$version" "$mermaid" > "build/${name}/VERSION"
# the time of the commit (a checkout made by somebody else - CI in a
# container - is still ours to ask); outside a checkout, a fixed one
when=${SOURCE_DATE_EPOCH:-$(git -c safe.directory='*' log -1 --format=%ct 2>/dev/null || echo 0)}
chmod -R u=rwX,go=rX "build/${name}"
tar -C build --sort=name --mtime="@${when}" --owner=0 --group=0 --numeric-owner \
    -cf - "${name}" | gzip -n -9 > "dist/${name}.tar.gz"
(cd dist && sha256sum -- * > SHA256SUMS)
echo "built dist/${name}.tar.gz (mermaid ${mermaid})"
tar -tzf "dist/${name}.tar.gz"
