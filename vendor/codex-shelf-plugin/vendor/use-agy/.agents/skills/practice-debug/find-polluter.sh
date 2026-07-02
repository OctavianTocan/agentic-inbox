#!/usr/bin/env bash
# Bisection script to find which test creates unwanted files/state
# Usage: ./find-polluter.sh <file_or_dir_to_check> <test_glob>
# Example: TEST_COMMAND='bunx vitest run' ./find-polluter.sh '.git' 'test/**/*.test.ts'

set -e

if [ $# -ne 2 ]; then
  echo "Usage: $0 <file_to_check> <test_glob>"
  echo "Example: TEST_COMMAND='bunx vitest run' $0 '.git' 'test/**/*.test.ts'"
  exit 1
fi

POLLUTION_CHECK="$1"
TEST_PATTERN="$2"
TEST_COMMAND="${TEST_COMMAND:-bunx vitest run}"

echo "🔍 Searching for test that creates: $POLLUTION_CHECK"
echo "Test pattern: $TEST_PATTERN"
echo ""

# Get list of test files. The repo keeps tests in package-level test/ directories.
TEST_FILES=$(rg --files -g "$TEST_PATTERN" | sort || true)
TOTAL=$(echo "$TEST_FILES" | wc -l | tr -d ' ')

echo "Found $TOTAL test files"
echo ""

if [ -z "$TEST_FILES" ]; then
  echo "No test files matched '$TEST_PATTERN'; refusing to report a clean result."
  exit 1
fi

COUNT=0
for TEST_FILE in $TEST_FILES; do
  COUNT=$((COUNT + 1))

  # Skip if pollution already exists
  if [ -e "$POLLUTION_CHECK" ]; then
    echo "⚠️  Pollution already exists before test $COUNT/$TOTAL"
    echo "   Skipping: $TEST_FILE"
    continue
  fi

  echo "[$COUNT/$TOTAL] Testing: $TEST_FILE"

  # Run the test
  $TEST_COMMAND "$TEST_FILE" > /dev/null 2>&1 || true

  # Check if pollution appeared
  if [ -e "$POLLUTION_CHECK" ]; then
    echo ""
    echo "🎯 FOUND POLLUTER!"
    echo "   Test: $TEST_FILE"
    echo "   Created: $POLLUTION_CHECK"
    echo ""
    echo "Pollution details:"
    ls -la "$POLLUTION_CHECK"
    echo ""
    echo "To investigate:"
    echo "  $TEST_COMMAND $TEST_FILE    # Run just this test"
    echo "  cat $TEST_FILE         # Review test code"
    echo "  bun run ci             # Final verification after fixing"
    exit 1
  fi
done

echo ""
echo "✅ No polluter found - all tests clean!"
exit 0
