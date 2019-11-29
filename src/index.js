const core = require('@actions/core')
const exec = require('@actions/exec')

const SCOPE_DSN = 'SCOPE_DSN'

const DEFAULT_COMMAND =
  'npm test -- --testRunner=@undefinedlabs/scope-agent/jestTestRunner --runner=@undefinedlabs/scope-agent/jestRunner --setupFilesAfterEnv=@undefinedlabs/scope-agent/jestSetupTests'

async function run() {
  try {
    const command = core.getInput('command') || DEFAULT_COMMAND
    const dsn = core.getInput('dsn') || process.env[SCOPE_DSN]

    if (!dsn) {
      throw Error('Cannot find the Scope DSN')
    }

    let apiEndpoint, apiKey
    try {
      const { username, origin } = new URL(dsn)
      apiEndpoint = origin
      apiKey = username
    } catch (e) {}

    console.log(`Command: ${command}`)
    if (dsn) {
      console.log(`DSN has been set.`)
    }

    await exec.exec('npm install --save-dev @undefinedlabs/scope-agent', null, {
      ignoreReturnCode: true,
    })

    return ExecScopeRun(command, apiEndpoint, apiKey)
  } catch (error) {
    core.setFailed(error.message)
  }
}

function ExecScopeRun(command = DEFAULT_COMMAND, apiEndpoint, apiKey) {
  return exec.exec(command, null, {
    env: {
      ...process.env,
      SCOPE_API_ENDPOINT: apiEndpoint,
      SCOPE_APIKEY: apiKey,
      SCOPE_AUTO_INSTRUMENT: true,
    },
  })
}

run()
