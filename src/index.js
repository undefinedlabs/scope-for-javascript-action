const core = require('@actions/core')
const exec = require('@actions/exec')
const fs = require('fs')

const SCOPE_DSN = 'SCOPE_DSN'

const DEFAULT_ARGUMENTS = [
  '--testRunner=@undefinedlabs/scope-agent/jest/testRunner',
  '--runner=@undefinedlabs/scope-agent/jest/runner',
  '--setupFilesAfterEnv=@undefinedlabs/scope-agent/jest/setupTests',
  '--runInBand',
]

const CYPRESS_SUPPORT_FILE = 'cypress/support/index.js'
const CYPRESS_PLUGIN_FILE = 'cypress/plugins/index.js'

const DEFAULT_CYPRESS_ARGUMENTS = [
  '--config',
  `supportFile=${CYPRESS_SUPPORT_FILE},pluginsFile=${CYPRESS_PLUGIN_FILE}`,
]

const NPM_DEFAULT_TEST_COMMAND = 'npm test'
const YARN_DEFAULT_TEST_COMMAND = 'yarn test'
const DEFAULT_CYPRESS_ENDPOINT = 'http://localhost:3000'

const NPM_INSTALL_COMMAND = 'npm install --save-dev @undefinedlabs/scope-agent'
const YARN_INSTALL_COMMAND = 'yarn add --dev @undefinedlabs/scope-agent'

const isYarnRepo = () => fs.existsSync('yarn.lock')

async function run() {
  try {
    const dsn = core.getInput('dsn') || process.env[SCOPE_DSN]

    if (!dsn) {
      throw Error('Cannot find the Scope DSN')
    }

    const isYarn = isYarnRepo()
    console.log(`Project is using ${isYarn ? 'yarn' : 'npm'}`)

    const defaultTestCommand = isYarn ? YARN_DEFAULT_TEST_COMMAND : NPM_DEFAULT_TEST_COMMAND

    const command = core.getInput('command') || defaultTestCommand

    const cypressCommand = core.getInput('command-cypress')
    const cypressEndpoint = core.getInput('cypress-endpoint') || DEFAULT_CYPRESS_ENDPOINT

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

    await exec.exec(isYarn ? YARN_INSTALL_COMMAND : NPM_INSTALL_COMMAND, null, {
      ignoreReturnCode: true,
    })

    // jest tests
    ExecJestTests(command, apiEndpoint, apiKey, isYarn)

    // cypress tests
    if (cypressCommand) {
      fs.writeFileSync(
        CYPRESS_SUPPORT_FILE,
        'require("@undefinedlabs/scope-agent/cypress/support")'
      )
      fs.writeFileSync(
        CYPRESS_PLUGIN_FILE,
        `
        const { initCypressPlugin } = require("@undefinedlabs/scope-agent/cypress/plugin");
        
        module.exports = async (on, config) => {
          const newConfig = await initCypressPlugin(on, config);
          return newConfig;
        };
      `
      )
      ExecCypressTests(cypressCommand, apiEndpoint, apiKey, isYarn, cypressEndpoint)
    }
  } catch (error) {
    core.setFailed(error.message)
  }
}

function ExecJestTests(command, apiEndpoint, apiKey, isYarn) {
  return exec.exec(command, isYarn ? DEFAULT_ARGUMENTS : ['--', ...DEFAULT_ARGUMENTS], {
    env: {
      ...process.env,
      SCOPE_API_ENDPOINT: apiEndpoint,
      SCOPE_APIKEY: apiKey,
      SCOPE_AUTO_INSTRUMENT: true,
      CI: true,
    },
  })
}

function ExecCypressTests(command, apiEndpoint, apiKey, isYarn, cypressEndpoint) {
  return exec.exec(
    command,
    isYarn ? DEFAULT_CYPRESS_ARGUMENTS : ['--', ...DEFAULT_CYPRESS_ARGUMENTS],
    {
      env: {
        ...process.env,
        SCOPE_API_ENDPOINT: apiEndpoint,
        SCOPE_APIKEY: apiKey,
        SCOPE_AUTO_INSTRUMENT: true,
        CI: true,
        CYPRESS_baseUrl: cypressEndpoint,
      },
    }
  )
}

run()
