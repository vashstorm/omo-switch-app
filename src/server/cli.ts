import path from "node:path";
import { expandHomePath } from "../shared/config/global-config";

export interface CliOptions {
  configPath?: string;
  port?: number;
  profilesRoot?: string;
  help?: boolean;
}

function printHelp(): void {
  console.log(`
Usage: omo-switch [options]

Options:
  -c, --config <path>    Specify config file path (default: ~/Library/Application Support/com.omo-switch/config.jsonc)
  -p, --port <number>    Specify port number (default: auto-assign)
  -r, --profiles <path>  Specify profiles root directory
  -h, --help            Show this help message
`);
}

export function parseArgs(args: string[]): CliOptions {
  const options: CliOptions = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === "-h" || arg === "--help") {
      options.help = true;
      continue;
    }

    if (arg === "-c" || arg === "--config") {
      const nextArg = args[i + 1];
      if (!nextArg || nextArg.startsWith("-")) {
        console.error(`Error: ${arg} requires a path argument`);
        process.exit(1);
      }
      options.configPath = path.resolve(expandHomePath(nextArg));
      i++;
      continue;
    }

    if (arg === "-p" || arg === "--port") {
      const nextArg = args[i + 1];
      if (!nextArg || nextArg.startsWith("-")) {
        console.error(`Error: ${arg} requires a port number`);
        process.exit(1);
      }
      const port = parseInt(nextArg, 10);
      if (isNaN(port) || port < 0 || port > 65535) {
        console.error(`Error: Invalid port number: ${nextArg}`);
        process.exit(1);
      }
      options.port = port;
      i++;
      continue;
    }

    if (arg === "-r" || arg === "--profiles") {
      const nextArg = args[i + 1];
      if (!nextArg || nextArg.startsWith("-")) {
        console.error(`Error: ${arg} requires a path argument`);
        process.exit(1);
      }
      options.profilesRoot = path.resolve(expandHomePath(nextArg));
      i++;
      continue;
    }

    if (arg.startsWith("-")) {
      console.error(`Error: Unknown option: ${arg}`);
      process.exit(1);
    }
  }

  return options;
}

export function handleCliArgs(args: string[]): CliOptions {
  const options = parseArgs(args);

  if (options.help) {
    printHelp();
    process.exit(0);
  }

  return options;
}
