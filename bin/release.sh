#!/usr/bin/env bash

echo "Cleaning..."
rm -rf release

PACKAGE_VERSION=$(cat dist/manifest.json \
  | grep '"version"' \
  | head -1 \
  | awk -F": " '{ print $2 }' \
  | sed 's/[",]//g')
echo "$PACKAGE_VERSION"

echo "Zipping..."
mkdir release
zip -r "release/package_hunter-${PACKAGE_VERSION}.zip" ./dist
