// fixture with a standalone workflow (no merging needed)

//<gen-github-workflow>
// name: deploy-standalone
// on:
//   push:
//     branches: [main]
//     paths:
//       - "$$directory/**"
// permissions:
//   contents: read
// jobs:
//   deploy:
//     name: Deploy Standalone
//     runs-on: ubuntu-latest
//     timeout-minutes: 15
//     steps:
//       - uses: actions/checkout@v5
//       - name: Deploy
//         run: echo "deploying $$file"
//   reusable:
//     name: Reusable Call
//     uses: ./.github/workflows/shared.yml
//     with:
//       param: value
//</gen-github-workflow>

export default {};
