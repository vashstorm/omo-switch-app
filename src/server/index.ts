import { handleCliArgs } from "./cli";
import { initializeLogger } from "../shared/logger";
import { validateExplicitGlobalConfig } from "../shared/config/global-config";

const cliOptions = handleCliArgs(process.argv.slice(2));

if (cliOptions.configPath) {
  try {
    validateExplicitGlobalConfig(cliOptions.configPath);
  } catch (error) {
    console.error(error instanceof Error ? `Error: ${error.message}` : `Error: ${String(error)}`);
    process.exit(1);
  }
}

initializeLogger(cliOptions.configPath);

const { createApp } = await import("./app");

const port = cliOptions.port;
const profilesRoot = cliOptions.profilesRoot;
const configPath = cliOptions.configPath;

await createApp({ port, profilesRoot, configPath });
