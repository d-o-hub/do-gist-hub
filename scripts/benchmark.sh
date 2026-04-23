#!/bin/bash
set -euo pipefail
echo "📊 Running Performance Benchmarks..."
pnpm run test:benchmark
