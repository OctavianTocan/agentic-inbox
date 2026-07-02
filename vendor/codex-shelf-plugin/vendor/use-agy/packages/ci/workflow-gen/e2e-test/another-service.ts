//<workflow-gen>
// name: ci-sample
// on:
//   pull_request:
//     branches: [main]
// jobs:
//   test:
//     name: Test
//     timeout-minutes: 10
//     steps:
//       - uses: actions/checkout@v5
//       - name: Test
//         run: echo "testing sample"
//</workflow-gen>
