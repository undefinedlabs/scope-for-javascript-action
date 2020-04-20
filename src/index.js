const core = require('@actions/core')
const exec = require('@actions/exec')
const fs = require('fs')

const SCOPE_DSN = 'SCOPE_DSN'

const NPM_INSTALL_COMMAND = 'npm install --save-dev @undefinedlabs/scope-agent'
const YARN_INSTALL_COMMAND = 'yarn add --dev @undefinedlabs/scope-agent'

const JEST_DEFAULT_ARGUMENTS = [
  '--testRunner=@undefinedlabs/scope-agent/jest/testRunner',
  '--globalSetup=@undefinedlabs/scope-agent/jest/globalSetup',
  '--setupFilesAfterEnv=@undefinedlabs/scope-agent/jest/setupTests',
]
const NPM_DEFAULT_TEST_COMMAND = 'npm test'
const YARN_DEFAULT_TEST_COMMAND = 'yarn test'

const CYPRESS_SUPPORT_FILE = 'SCOPE_supportIndex.js'
const CYPRESS_PLUGIN_FILE = 'SCOPE_pluginIndex.js'
const DEFAULT_CYPRESS_ENDPOINT = 'http://localhost:3000'
const CYPRESS_DEFAULT_ARGUMENTS = [
  '--config',
  `supportFile=${CYPRESS_SUPPORT_FILE},pluginsFile=${CYPRESS_PLUGIN_FILE}`,
]

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

    const command = core.getInput('jest-command') || defaultTestCommand

    const cypressCommand = core.getInput('cypress-command')
    const cypressEndpoint = core.getInput('cypress-endpoint') || DEFAULT_CYPRESS_ENDPOINT

    console.log(`Command: ${command}`)
    if (dsn) {
      console.log(`DSN has been set.`)
    }

    await exec.exec(isYarn ? YARN_INSTALL_COMMAND : NPM_INSTALL_COMMAND, null, {
      ignoreReturnCode: true,
    })

    // Jest tests
    runTests(command, isYarn ? JEST_DEFAULT_ARGUMENTS : ['--', ...JEST_DEFAULT_ARGUMENTS], dsn)

    // Cypress tests
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
      runTests(
        cypressCommand,
        isYarn ? CYPRESS_DEFAULT_ARGUMENTS : ['--', ...CYPRESS_DEFAULT_ARGUMENTS],
        dsn,
        {
          CYPRESS_baseUrl: cypressEndpoint,
        }
      )
    }
  } catch (error) {
    core.setFailed(error.message)
  }
}

function runTests(command, defaultArguments, dsn, extraEnvVariables = {}) {
  return exec.exec(command, defaultArguments, {
    env: {
      ...process.env,
      SCOPE_DSN: dsn,
      SCOPE_INSTRUMENTATION_ENABLED: true,
      CI: true,
      ...extraEnvVariables,
    },
  })
}

run()
