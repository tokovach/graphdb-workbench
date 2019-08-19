#!/usr/bin/env bash

set -eu

echo "Working directory: $(pwd)"

GRAPHDB_VERSION=$1
GRAPHDB_DOWNLOAD_URL="http://maven.ontotext.com/repository/owlim-releases/com/ontotext/graphdb/graphdb-free/${GRAPHDB_VERSION}/graphdb-free-${GRAPHDB_VERSION}-dist.zip"

echo "Downloading GraphDB from $GRAPHDB_DOWNLOAD_URL"

curl -SL ${GRAPHDB_DOWNLOAD_URL} -o /tmp/graphdb.zip
unzip -q /tmp/graphdb.zip -d /tmp/graphdb-tmp
mv /tmp/graphdb-tmp/graphdb* /opt/graphdb

echo "Starting GraphDB daemon"
/opt/graphdb/bin/graphdb -d \
    -Dgraphdb.home=/opt/graphdb \
    -Dgraphdb.workbench.home=./src/ \
    -Dgraphdb.workbench.importDirectory=./test-cypress/fixtures/graphdb-import/

echo "Waiting until GraphDB is reachable"
npm install -g wait-on

# Wait GraphDB for 60 seconds
wait-on http://localhost:7200 -t 60000

echo "Starting the tests!"
npx cypress run --record=false --config baseUrl=http://localhost:7200,video=false

