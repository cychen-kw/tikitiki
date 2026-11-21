#!/bin/sh
# 打包擴充功能為 dist/tikitiki.zip（只含已 commit 的執行檔案）
set -e
cd "$(dirname "$0")/.."
mkdir -p dist
git archive --format=zip --prefix=tikitiki/ -o dist/tikitiki.zip HEAD \
  manifest.json background.js options.html options.js css js assets LICENSE
echo "dist/tikitiki.zip"
