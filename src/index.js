const core = require('@actions/core')
const exec = require('@actions/exec')
const path = require('path')
const fs = require('fs')

const SCOPE_DSN = 'SCOPE_DSN'

const DEFAULT_ARGUMENTS = [
  '--testRunner=@undefinedlabs/scope-agent/jest/testRunner',
  '--runner=@undefinedlabs/scope-agent/jest/runner',
  '--setupFilesAfterEnv=@undefinedlabs/scope-agent/jest/setupTests',
  '--runInBand',
  '--ci',
]

const DEFAULT_COMMAND = 'npm test'

const NPM_INSTALL_COMMAND = 'npm install --save-dev @undefinedlabs/scope-agent'
const YARN_INSTALL_COMMAND = 'yarn add --dev @undefinedlabs/scope-agent'

const isYarnRepo = (cwd = process.cwd()) => fs.existsSync(path.resolve(cwd, 'yarn.lock'))

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

    const isYarn = isYarnRepo()

    await exec.exec(isYarn ? YARN_INSTALL_COMMAND : NPM_INSTALL_COMMAND, null, {
      ignoreReturnCode: true,
    })

    return ExecScopeRun(command, apiEndpoint, apiKey, isYarn)
  } catch (error) {
    core.setFailed(error.message)
  }
}

function ExecScopeRun(command = DEFAULT_COMMAND, apiEndpoint, apiKey, isYarn) {
  return exec.exec(command, isYarn ? DEFAULT_ARGUMENTS : ['--', ...DEFAULT_ARGUMENTS], {
    env: {
      ...process.env,
      SCOPE_API_ENDPOINT: apiEndpoint,
      SCOPE_APIKEY: apiKey,
      SCOPE_AUTO_INSTRUMENT: true,
    },
  })
}

run()
