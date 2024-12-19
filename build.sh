#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"

if ! [[ -d openssl/Configurations ]]; then
    echo "submodule does not appear to be initialised"
    exit 1
fi

WASI_VERSION=25
WASI_VERSION_FULL=${WASI_VERSION}.0

os=linux
if [[ "$(uname -s)" == "Darwin" ]]; then
    os=macos
fi

WASI_SDK_PATH="wasi-sdk-${WASI_VERSION_FULL}-$(uname -m)-$os"
WASI_SDK_ZIP="$WASI_SDK_PATH.tar.gz"
echo "Selected WASI SDK: $WASI_SDK_PATH"

if [[ -f "$WASI_SDK_ZIP" ]]; then
    echo "Reusing existing WASI SDK ZIP"
else
    wget https://github.com/WebAssembly/wasi-sdk/releases/download/wasi-sdk-${WASI_VERSION}/$WASI_SDK_ZIP
fi

if ! [[ -d $WASI_SDK_PATH ]]; then
    tar xvf $WASI_SDK_ZIP
fi

export CC="$(pwd)/${WASI_SDK_PATH}/bin/clang --sysroot=$(pwd)/${WASI_SDK_PATH}/share/wasi-sysroot"
export AR="$(pwd)/${WASI_SDK_PATH}/bin/llvm-ar"
export RANLIB="$(pwd)/${WASI_SDK_PATH}/bin/llvm-ranlib"
(cd openssl && git reset --hard && git clean -fdx)
patch -d openssl -p1 <openssl.patch
(cd openssl && ./Configure wasm32-wasip2 no-dgram no-quic no-tests no-ui-console no-sock no-posix-io)
(cd openssl && make -j$(nproc))
(cd web && npm ci)
(cd web && npm exec -- jco transpile ../openssl/apps/openssl -o ./src/assets/openssl-wasi --no-nodejs-compat --instantiation async --multi-memory)
(cd web && npm run lint)
(cd web && npm run build)
