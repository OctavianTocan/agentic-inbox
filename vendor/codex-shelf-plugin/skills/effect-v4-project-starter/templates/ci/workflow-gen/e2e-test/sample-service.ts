//<workflow-gen>
// name: ci-sample
// required: true
// on:
//   push:
//     branches: [main]
// permissions:
//   contents: read
// concurrency:
//   group: ci-sample-${{ github.ref }}
//   cancel-in-progress: true
// jobs:
//   build:
//     name: Build
//     timeout-minutes: 10
//     steps:
//       - uses: actions/checkout@v5
//       - name: Build
//         run: echo "building sample"
//</workflow-gen>
