#!/usr/bin/env node

import { FileSystemMCPServer } from './server.js';

/**
 * FileSystem MCP Server Entry Point
 * 
 * This server provides comprehensive file system operations via the Model Context Protocol.
 * It includes file operations, directory management, file watching, search, and archiving.
 */

function parseArgs(args: string[]): { transport?: 'stdio' | 'http'; port?: number; host?: string } {
  const options: { transport?: 'stdio' | 'http'; port?: number; host?: string } = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (!arg) continue;
    if (arg === '--transport') {
      const next = args[++i];
      if (next === 'http' || next === 'stdio') options.transport = next;
    } else if (arg.startsWith('--transport=')) {
      const val = arg.split('=')[1];
      if (val === 'http' || val === 'stdio') options.transport = val;
    } else if (arg === '--port') {
      const next = args[++i];
      if (next) options.port = parseInt(next, 10);
    } else if (arg.startsWith('--port=')) {
      const val = arg.split('=')[1];
      if (val) options.port = parseInt(val, 10);
    } else if (arg === '--host') {
      const next = args[++i];
      if (next) options.host = next;
    } else if (arg.startsWith('--host=')) {
      const val = arg.split('=')[1];
      if (val) options.host = val;
    }
  }

  return options;
}

async function main(): Promise<void> {
  try {
    const options = parseArgs(process.argv.slice(2));
    const server = new FileSystemMCPServer();

    const shutdown = async () => {
      console.error('Shutting down FileSystem MCP Server...');
      await server.stop();
      process.exit(0);
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);

    await server.run(options);
  } catch (error) {
    console.error('Failed to start FileSystem MCP Server:', error);
    process.exit(1);
  }
}

// Start the server
main().catch((error) => {
  console.error('Unhandled error in main:', error);
  process.exit(1);
});