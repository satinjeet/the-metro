#!/bin/sh
# Installs the standalone `themetro` binary from this repo's GitHub releases.
#
#   curl -fsSL https://raw.githubusercontent.com/satinjeet/the-metro/main/install.sh | sh
#
# Env vars:
#   METRO_VERSION     Install this version instead of the latest release
#                      (e.g. "0.2.5"). No leading "v".
#   METRO_INSTALL_DIR Where the binary goes. Default: /usr/local/bin
#                      (falls back to ~/.local/bin if that isn't writable).
#   GITHUB_TOKEN       Sent as `Authorization: token $GITHUB_TOKEN` - needed
#                      only while this repo/its releases are private.
#
# Installs two entry points, both pointing at the one downloaded binary:
# `themetro` and, as a symlink, `themetro-mcp`.
set -eu

REPO="https://github.com/satinjeet/the-metro"
API="https://api.github.com/repos/satinjeet/the-metro"

curl_auth() {
  if [ -n "${GITHUB_TOKEN:-}" ]; then
    curl -fsSL -H "Authorization: token $GITHUB_TOKEN" "$@"
  else
    curl -fsSL "$@"
  fi
}

# --- OS / arch / libc -> one of this repo's target names ------------------
os=$(uname -s)
machine=$(uname -m)

case "$machine" in
  x86_64|amd64)  arch=x64 ;;
  aarch64|arm64) arch=arm64 ;;
  *) echo "install.sh: no themetro build for architecture '$machine'." >&2; exit 1 ;;
esac

case "$os" in
  Linux)
    libc=glibc
    if command -v ldd >/dev/null 2>&1 && ldd --version 2>&1 | grep -qi musl; then
      libc=musl
    fi
    case "$arch-$libc" in
      x64-glibc)   target=linux-x64 ;;
      x64-musl)    target=linux-musl-x64 ;;
      arm64-glibc) target=linux-arm64 ;;
      arm64-musl)  target=linux-arm64-musl ;;
    esac
    ;;
  Darwin)
    if [ "$arch" != "arm64" ]; then
      echo "install.sh: no themetro build for macOS $machine (Apple Silicon only)." >&2
      exit 1
    fi
    target=darwin-arm64
    ;;
  *)
    echo "install.sh: no themetro build for OS '$os'." >&2
    exit 1
    ;;
esac

# --- Which release ----------------------------------------------------------
if [ -n "${METRO_VERSION:-}" ]; then
  version=$METRO_VERSION
  tag="v$version"
else
  tag=$(curl_auth "$API/releases/latest" | sed -n 's/.*"tag_name": *"\([^"]*\)".*/\1/p')
  if [ -z "$tag" ]; then
    echo "install.sh: could not find the latest release - is this repo private? Set GITHUB_TOKEN." >&2
    exit 1
  fi
  version=${tag#v}
fi

asset="themetro-$version-$target"
download_url="$REPO/releases/download/$tag/$asset"
sums_url="$REPO/releases/download/$tag/SHA256SUMS"

echo "install.sh: installing themetro $version ($target)"

tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT

curl_auth -o "$tmp/$asset" "$download_url"
curl_auth -o "$tmp/SHA256SUMS" "$sums_url"

# Verify against the one matching line, not the whole file - SHA256SUMS
# covers every target's binary, not just this one.
expected=$(grep " $asset\$" "$tmp/SHA256SUMS" | awk '{print $1}')
if [ -z "$expected" ]; then
  echo "install.sh: '$asset' has no entry in SHA256SUMS - refusing to install an unverified binary." >&2
  exit 1
fi
if command -v sha256sum >/dev/null 2>&1; then
  actual=$(sha256sum "$tmp/$asset" | awk '{print $1}')
elif command -v shasum >/dev/null 2>&1; then
  actual=$(shasum -a 256 "$tmp/$asset" | awk '{print $1}')
else
  echo "install.sh: neither sha256sum nor shasum is available - cannot verify the download." >&2
  exit 1
fi
if [ "$expected" != "$actual" ]; then
  echo "install.sh: checksum mismatch for '$asset'." >&2
  echo "  expected: $expected" >&2
  echo "  actual:   $actual" >&2
  exit 1
fi

# --- Install ------------------------------------------------------------
install_dir=${METRO_INSTALL_DIR:-/usr/local/bin}
if [ ! -w "$install_dir" ] 2>/dev/null; then
  install_dir="$HOME/.local/bin"
  mkdir -p "$install_dir"
fi

chmod +x "$tmp/$asset"
mv "$tmp/$asset" "$install_dir/themetro"
ln -sf "$install_dir/themetro" "$install_dir/themetro-mcp"

echo "install.sh: installed to $install_dir/themetro (+ themetro-mcp symlink)"
case ":$PATH:" in
  *":$install_dir:"*) ;;
  *) echo "install.sh: add '$install_dir' to your PATH." ;;
esac
"$install_dir/themetro" --version
