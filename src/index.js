const core = require('@actions/core')
const exec = require('@actions/exec')

const SCOPE_DSN = 'SCOPE_DSN'

const DEFAULT_ARGUMENTS = [
  '--',
  '--testRunner=@undefinedlabs/scope-agent/jest/testRunner',
  '--runner=@undefinedlabs/scope-agent/jest/runner',
  '--setupFilesAfterEnv=@undefinedlabs/scope-agent/jest/setupTests',
]

const DEFAULT_COMMAND = 'npm test'

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

    if (!apiEndpoint || !apiKey) {
      throw Error('SCOPE_DSN does not have the correct format')
    }

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
  return exec.exec(command, DEFAULT_ARGUMENTS, {
    env: {
      ...process.env,
      SCOPE_API_ENDPOINT: apiEndpoint,
      SCOPE_APIKEY: apiKey,
      SCOPE_AUTO_INSTRUMENT: true,
    },
  })
}

run()
