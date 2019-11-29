![logo](scope_logo.svg)

# Scope for Javascript

GitHub Action to run your tests automatically instrumented with the [Scope Javascript agent](http://home.undefinedlabs.com/goto/javascript-agent).

## About Scope

[Scope](https://scope.dev) gives developers production-level visibility on every test for every app – spanning mobile, monoliths, and microservices.

## Usage

1. Set Scope DSN inside Settings > Secrets as `SCOPE_DSN`.
2. Add a step to your GitHub Actions workflow YAML that uses this action:

```yml
steps:
  - uses: actions/checkout@v1
  - uses: actions/setup-node@v1
    with:
      node-version: 12
      registry-url: https://registry.npmjs.org/
  - name: Install dependencies
    run: npm install
  - name: Scope for Javascript
    uses: undefinedlabs/scope-for-javascript-action@v1
    with:
      dsn: ${{secrets.SCOPE_DSN}} # required
      command: npm test # optional - default is 'npm test'
```
