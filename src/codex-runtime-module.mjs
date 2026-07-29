import { CodexAppServerRuntime } from './codex-app-server-runtime.mjs'

export function createRuntime({ config, environment }) {
  return new CodexAppServerRuntime({ config, environment })
}
