#!/usr/bin/env node
import { Command } from 'commander';
import { startServer } from './server.js';
import { configureApiKey, showConfig, runDiagnostics } from './config.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const program = new Command();

program
  .name('render-mcp')
  .description('Render.com MCP server for AI assistants')
  .version('1.1.0');

program
  .command('start')
  .description('Start the MCP server')
  .action(() => {
    startServer();
  });

program
  .command('configure')
  .description('Configure your Render API key')
  .option('--api-key <key>', 'Your Render API key')
  .action((options) => {
    configureApiKey(options.apiKey);
  });

program
  .command('config')
  .description('Show current configuration')
  .action(() => {
    showConfig();
  });

program
  .command('doctor')
  .description('Run diagnostics on your setup')
  .action(() => {
    runDiagnostics();
  });

program.parse(process.argv);

// Default to start if no command provided
if (!process.argv.slice(2).length) {
  startServer();
}
