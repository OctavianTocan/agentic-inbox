// this file is a fixture for e2e testing gen-github-workflow

//<gen-github-workflow>
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
//</gen-github-workflow>

export const sample = 'hello';
