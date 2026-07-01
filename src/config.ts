import fs from 'fs';
import path from 'path';
import os from 'os';
import { promisify } from 'util';
import inquirer from 'inquirer';
import { RenderClient } from './renderClient.js';

const mkdir = promisify(fs.mkdir);
const writeFile = promisify(fs.writeFile);
const readFile = promisify(fs.readFile);

/**
 * Configuration for the Render MCP server
 */
export interface RenderConfig {
  apiKey?: string;
  /** Currently selected workspace/owner ID, used as the default for create_* tools and logs/metrics. */
  selectedOwnerId?: string;
}

/**
 * Path to the config directory
 */
const CONFIG_DIR = path.join(os.homedir(), '.render-mcp');

/**
 * Path to the config file
 */
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');

/**
 * Get the current configuration
 * @returns Configuration object
 */
export async function getConfig(): Promise<RenderConfig | null> {
  try {
    if (!fs.existsSync(CONFIG_FILE)) {
      return null;
    }
    
    const configData = await readFile(CONFIG_FILE, 'utf-8');
    return JSON.parse(configData) as RenderConfig;
  } catch (error) {
    console.error('Error reading config:', error);
    return null;
  }
}

/**
 * Save the configuration
 * @param config Configuration object
 */
export async function saveConfig(config: RenderConfig): Promise<void> {
  try {
    if (!fs.existsSync(CONFIG_DIR)) {
      await mkdir(CONFIG_DIR, { recursive: true });
    }
    
    await writeFile(CONFIG_FILE, JSON.stringify(config, null, 2));
    console.error(`Configuration saved to ${CONFIG_FILE}`);
  } catch (error) {
    console.error('Error saving config:', error);
    throw new Error(`Failed to save configuration: ${error}`);
  }
}

/**
 * Configure the API key
 * @param apiKey API key (optional, will prompt if not provided)
 */
export async function configureApiKey(apiKey?: string): Promise<void> {
  let key = apiKey;
  
  if (!key) {
    const answers = await inquirer.prompt([
      {
        type: 'password',
        name: 'apiKey',
        message: 'Enter your Render API key:',
        validate: (input: string) => input.length > 0 ? true : 'API key is required'
      }
    ]);
    
    key = answers.apiKey;
  }
  
  if (!key) {
    throw new Error('API key is required');
  }
  
  // Test the API key
  const client = new RenderClient(key);
  try {
    const isValid = await client.testConnection();
    if (!isValid) {
      throw new Error('Invalid API key');
    }
    
    const existing = (await getConfig()) || {};
    await saveConfig({ ...existing, apiKey: key });
    console.log('API key configured successfully');
  } catch (error) {
    console.error('Error testing API key:', error);
    throw new Error(`Failed to configure API key: ${error}`);
  }
}

/**
 * Show the current configuration
 */
export async function showConfig(): Promise<void> {
  const config = await getConfig();
  
  if (!config) {
    console.log('No configuration found. Run "render-mcp configure" to set up.');
    return;
  }
  
  console.log('Current configuration:');
  console.log(`API Key: ${config.apiKey ? '********' : 'Not configured'}`);
}

/**
 * Run diagnostics on the setup
 */
export async function runDiagnostics(): Promise<void> {
  console.log('Running diagnostics...');
  
  // Check config file
  const configExists = fs.existsSync(CONFIG_FILE);
  console.log(`Config file: ${configExists ? 'Found' : 'Not found'}`);
  
  if (!configExists) {
    console.log('Run "render-mcp configure" to set up your API key');
    return;
  }
  
  // Check API key
  const config = await getConfig();
  if (!config || !config.apiKey) {
    console.log('API key: Not configured');
    console.log('Run "render-mcp configure" to set up your API key');
    return;
  }
  
  console.log('API key: Configured');
  
  // Test API connection
  const client = new RenderClient(config.apiKey);
  try {
    const isValid = await client.testConnection();
    console.log(`API connection: ${isValid ? 'Success' : 'Failed'}`);
    
    if (isValid) {
      // Get services to verify permissions
      const services = await client.listServices({ limit: 1 });
      console.log(`API permissions: ${services ? 'Valid' : 'Unknown'}`);
    }
  } catch (error) {
    console.error('API connection: Failed');
    console.error(`Error: ${error}`);
  }
}

/**
 * Get the currently selected workspace/owner ID from config.
 * @returns The selected owner ID, or null if none has been selected
 */
export async function getSelectedOwnerId(): Promise<string | null> {
  const config = await getConfig();
  return config?.selectedOwnerId || null;
}

/**
 * Persist the selected workspace/owner ID, preserving the rest of the config.
 * @param ownerId Owner ID to select
 */
export async function setSelectedOwnerId(ownerId: string): Promise<void> {
  const existing = (await getConfig()) || {};
  await saveConfig({ ...existing, selectedOwnerId: ownerId });
}

/**
 * Get the API key from environment or config
 * @returns API key
 */
export async function getApiKey(): Promise<string> {
  // First check environment variable
  const envApiKey = process.env.RENDER_API_KEY;
  if (envApiKey) {
    return envApiKey;
  }
  
  // Then check config file
  const config = await getConfig();
  if (config && config.apiKey) {
    return config.apiKey;
  }
  
  throw new Error('API key not found. Set RENDER_API_KEY environment variable or run "render-mcp configure"');
}
