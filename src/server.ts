import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError
} from '@modelcontextprotocol/sdk/types.js';
import { RenderClient } from './renderClient.js';
import { getApiKey, getSelectedOwnerId, setSelectedOwnerId } from './config.js';
import { ServiceType } from './types/renderTypes.js';
import { buildEnvSpecificDetails, pruneUndefined, toAutoDeploy } from './createHelpers.js';
import {
  cancelDeploySchema,
  createCronJobSchema,
  createKeyValueSchema,
  createPostgresSchema,
  createServiceSchema,
  createStaticSiteSchema,
  createWebServiceSchema,
  deleteServiceSchema,
  deployServiceSchema,
  getDeploySchema,
  getDeploysSchema,
  getKeyValueSchema,
  getMetricsSchema,
  getPostgresSchema,
  getSelectedWorkspaceSchema,
  getServiceSchema,
  getWorkspaceSchema,
  listKeyValueSchema,
  listLogLabelValuesSchema,
  listLogsSchema,
  listPostgresSchema,
  listServicesSchema,
  listWorkspacesSchema,
  manageDomainsSchema,
  manageEnvVarsSchema,
  queryRenderPostgresSchema,
  restartServiceSchema,
  selectWorkspaceSchema
} from './types/toolSchemas.js';

/**
 * Wrap a JSON-serializable value in the standard MCP text-content response.
 */
function jsonResult(value: unknown) {
  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(value, null, 2),
      },
    ],
  };
}

/**
 * Resolve an owner/workspace ID: use the explicitly provided one, otherwise
 * fall back to the selected workspace from config. Throws if neither exists.
 */
async function resolveOwnerId(provided?: string): Promise<string> {
  const ownerId = provided || (await getSelectedOwnerId());
  if (!ownerId) {
    throw new Error(
      'No ownerId provided and no workspace selected. ' +
      'Pass ownerId or call select_workspace first (list_workspaces to see options).'
    );
  }
  return ownerId;
}

/**
 * Start the MCP server
 */
export async function startServer(): Promise<void> {
  console.error('Starting Render MCP server...');
  
  try {
    // Get API key
    const apiKey = await getApiKey();
    
    // Create Render client
    const renderClient = new RenderClient(apiKey);
    
    // Create MCP server
    const server = new Server(
      {
        name: 'render-mcp',
        version: '1.1.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );
    
    // Set up tool handlers
    setupToolHandlers(server, renderClient);
    
    // Set up error handler
    server.onerror = (error) => {
      console.error('[MCP Error]', error);
    };
    
    // Handle process signals
    process.on('SIGINT', async () => {
      await server.close();
      process.exit(0);
    });
    
    // Connect to transport
    const transport = new StdioServerTransport();
    await server.connect(transport);
    
    console.error('Render MCP server running on stdio');
  } catch (error) {
    console.error('Failed to start MCP server:', error);
    process.exit(1);
  }
}

/**
 * Set up tool handlers for the MCP server
 * @param server MCP server
 * @param renderClient Render API client
 */
function setupToolHandlers(server: Server, renderClient: RenderClient): void {
  // List available tools
  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [
      {
        name: 'list_services',
        description: 'List all services in your Render account',
        inputSchema: listServicesSchema,
      },
      {
        name: 'get_service',
        description: 'Get details of a specific service',
        inputSchema: getServiceSchema,
      },
      {
        name: 'deploy_service',
        description: 'Deploy a service',
        inputSchema: deployServiceSchema,
      },
      {
        name: 'create_service',
        description: 'Create a new service',
        inputSchema: createServiceSchema,
      },
      {
        name: 'delete_service',
        description: 'Delete a service',
        inputSchema: deleteServiceSchema,
      },
      {
        name: 'get_deploys',
        description: 'Get deployment history for a service',
        inputSchema: getDeploysSchema,
      },
      {
        name: 'manage_env_vars',
        description: 'Manage environment variables for a service',
        inputSchema: manageEnvVarsSchema,
      },
      {
        name: 'manage_domains',
        description: 'Manage custom domains for a service',
        inputSchema: manageDomainsSchema,
      },
      // --- Workspaces / owners ---
      {
        name: 'list_workspaces',
        description: 'List all workspaces (owners) accessible to your API key',
        inputSchema: listWorkspacesSchema,
      },
      {
        name: 'get_workspace',
        description: 'Get details of a specific workspace (owner)',
        inputSchema: getWorkspaceSchema,
      },
      {
        name: 'select_workspace',
        description: 'Select a workspace as the default owner for create/logs/metrics tools',
        inputSchema: selectWorkspaceSchema,
      },
      {
        name: 'get_selected_workspace',
        description: 'Show the currently selected default workspace',
        inputSchema: getSelectedWorkspaceSchema,
      },
      // --- Deploys ---
      {
        name: 'get_deploy',
        description: 'Get details of a specific deploy by ID',
        inputSchema: getDeploySchema,
      },
      {
        name: 'cancel_deploy',
        description: 'Cancel an in-progress deploy',
        inputSchema: cancelDeploySchema,
      },
      // --- Services (extras) ---
      {
        name: 'restart_service',
        description: 'Restart a running service without triggering a new build/deploy',
        inputSchema: restartServiceSchema,
      },
      {
        name: 'create_web_service',
        description: 'Create a new web service (Node, Python, Go, Rust, Ruby, Elixir, or Docker)',
        inputSchema: createWebServiceSchema,
      },
      {
        name: 'create_static_site',
        description: 'Create a new static site',
        inputSchema: createStaticSiteSchema,
      },
      {
        name: 'create_cron_job',
        description: 'Create a new cron job that runs on a schedule',
        inputSchema: createCronJobSchema,
      },
      // --- Logs ---
      {
        name: 'list_logs',
        description: 'List and filter logs across services in a workspace',
        inputSchema: listLogsSchema,
      },
      {
        name: 'list_log_label_values',
        description: 'List the available values for a given log label (e.g. level, type, host)',
        inputSchema: listLogLabelValuesSchema,
      },
      // --- Metrics ---
      {
        name: 'get_metrics',
        description: 'Get performance metrics (CPU, memory, HTTP, bandwidth, instances) for a resource',
        inputSchema: getMetricsSchema,
      },
      // --- Postgres ---
      {
        name: 'list_postgres',
        description: 'List Render Postgres instances',
        inputSchema: listPostgresSchema,
      },
      {
        name: 'get_postgres',
        description: 'Get details of a Render Postgres instance',
        inputSchema: getPostgresSchema,
      },
      {
        name: 'create_postgres',
        description: 'Create a new Render Postgres instance',
        inputSchema: createPostgresSchema,
      },
      {
        name: 'query_render_postgres',
        description: 'Run a READ-ONLY SQL query against a Render Postgres instance',
        inputSchema: queryRenderPostgresSchema,
      },
      // --- Key Value (Redis) ---
      {
        name: 'list_key_value',
        description: 'List Render Key Value (Redis) instances',
        inputSchema: listKeyValueSchema,
      },
      {
        name: 'get_key_value',
        description: 'Get details of a Render Key Value instance',
        inputSchema: getKeyValueSchema,
      },
      {
        name: 'create_key_value',
        description: 'Create a new Render Key Value (Redis) instance',
        inputSchema: createKeyValueSchema,
      },
    ],
  }));

  // Handle tool calls
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    try {
      // Most tools require arguments; get_selected_workspace takes none.
      if (!request.params.arguments && request.params.name !== 'get_selected_workspace') {
        throw new McpError(
          ErrorCode.InvalidParams,
          'Tool arguments are required'
        );
      }

      const args = (request.params.arguments || {}) as any;

      switch (request.params.name) {
        case 'list_services':
          return await handleListServices(renderClient, args.params);
        
        case 'get_service':
          return await handleGetService(renderClient, args.params);
        
        case 'deploy_service':
          return await handleDeployService(renderClient, args.params);
        
        case 'create_service':
          return await handleCreateService(renderClient, args.params);
        
        case 'delete_service':
          return await handleDeleteService(renderClient, args.params);
        
        case 'get_deploys':
          return await handleGetDeploys(renderClient, args.params);
        
        case 'manage_env_vars':
          return await handleManageEnvVars(renderClient, args.params);
        
        case 'manage_domains':
          return await handleManageDomains(renderClient, args.params);

        case 'list_workspaces':
          return await handleListWorkspaces(renderClient, args.params);

        case 'get_workspace':
          return await handleGetWorkspace(renderClient, args.params);

        case 'select_workspace':
          return await handleSelectWorkspace(renderClient, args.params);

        case 'get_selected_workspace':
          return await handleGetSelectedWorkspace();

        case 'get_deploy':
          return jsonResult(await renderClient.getDeploy(
            args.params.serviceId,
            args.params.deployId
          ));

        case 'cancel_deploy':
          return jsonResult(await renderClient.cancelDeploy(
            args.params.serviceId,
            args.params.deployId
          ));

        case 'restart_service':
          await renderClient.restartService(args.params.serviceId);
          return jsonResult({ message: `Service ${args.params.serviceId} restart requested` });

        case 'create_web_service':
          return await handleCreateWebService(renderClient, args.params);

        case 'create_static_site':
          return await handleCreateStaticSite(renderClient, args.params);

        case 'create_cron_job':
          return await handleCreateCronJob(renderClient, args.params);

        case 'list_logs':
          return await handleListLogs(renderClient, args.params);

        case 'list_log_label_values':
          return await handleListLogLabelValues(renderClient, args.params);

        case 'get_metrics':
          return jsonResult(await renderClient.getMetrics(args.params));

        case 'list_postgres':
          return await handleListPostgres(renderClient, args.params);

        case 'get_postgres':
          return jsonResult(await renderClient.getPostgres(args.params.postgresId));

        case 'create_postgres':
          return await handleCreatePostgres(renderClient, args.params);

        case 'query_render_postgres':
          return jsonResult(await renderClient.queryPostgres(
            args.params.postgresId,
            args.params.sql
          ));

        case 'list_key_value':
          return await handleListKeyValue(renderClient, args.params);

        case 'get_key_value':
          return jsonResult(await renderClient.getKeyValue(args.params.keyValueId));

        case 'create_key_value':
          return await handleCreateKeyValue(renderClient, args.params);

        default:
          throw new McpError(
            ErrorCode.MethodNotFound,
            `Unknown tool: ${request.params.name}`
          );
      }
    } catch (error) {
      console.error(`Error handling tool call ${request.params.name}:`, error);
      
      return {
        content: [
          {
            type: 'text',
            text: `Error: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      };
    }
  });
}

/**
 * Handle list_services tool
 */
async function handleListServices(renderClient: RenderClient, params: any) {
  const { limit, cursor } = params || {};
  const services = await renderClient.listServices({ limit, cursor });
  
  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(services, null, 2),
      },
    ],
  };
}

/**
 * Handle get_service tool
 */
async function handleGetService(renderClient: RenderClient, params: any) {
  try {
    const { serviceId } = params;
    console.error(`Getting service details for ${serviceId}`);
    
    // Get the service details
    const service = await renderClient.getService(serviceId);
    
    // Log the response for debugging
    console.error(`Service response: ${JSON.stringify(service)}`);
    
    // Check if service object is defined
    if (!service) {
      throw new Error('Service response is undefined');
    }
    
    // Format the response
    const responseText = JSON.stringify(service, null, 2);
    
    // Return a properly formatted response
    return {
      content: [
        {
          type: 'text',
          text: responseText,
        },
      ],
    };
  } catch (error) {
    console.error('Get service error:', error);
    return {
      content: [
        {
          type: 'text',
          text: `Error getting service details: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
      isError: true,
    };
  }
}

/**
 * Handle deploy_service tool
 */
async function handleDeployService(renderClient: RenderClient, params: any) {
  try {
    const { serviceId, clearCache } = params;
    console.error(`Deploying service ${serviceId} with clearCache=${clearCache}`);
    
    // Deploy the service
    const deploy = await renderClient.deployService(serviceId, clearCache ? { clearCache } : {});
    
    // Log the response for debugging
    console.error(`Deploy response: ${JSON.stringify(deploy)}`);
    
    // Check if deploy object is defined
    if (!deploy) {
      throw new Error('Deployment response is undefined');
    }
    
    // Create a simple success message
    let successMessage = `Successfully deployed service ${serviceId}.`;
    
    // Add deployment details if available
    if (deploy.id) {
      successMessage += ` Deployment ID: ${deploy.id}`;
    }
    
    if (deploy.status) {
      successMessage += `, Status: ${deploy.status}`;
    }
    
    // Return a properly formatted response
    return {
      content: [
        {
          type: 'text',
          text: successMessage,
        },
      ],
    };
  } catch (error) {
    console.error('Deploy service error:', error);
    return {
      content: [
        {
          type: 'text',
          text: `Error deploying service: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
      isError: true,
    };
  }
}

/**
 * Handle create_service tool
 */
async function handleCreateService(renderClient: RenderClient, params: any) {
  // Render models autoDeploy as "yes"/"no", not a boolean.
  const payload = params?.autoDeploy === undefined
    ? params
    : { ...params, autoDeploy: toAutoDeploy(params.autoDeploy) };
  const service = await renderClient.createService(payload);

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(service, null, 2),
      },
    ],
  };
}

/**
 * Handle delete_service tool
 */
async function handleDeleteService(renderClient: RenderClient, params: any) {
  const { serviceId } = params;
  await renderClient.deleteService(serviceId);
  
  return {
    content: [
      {
        type: 'text',
        text: `Service ${serviceId} deleted successfully`,
      },
    ],
  };
}

/**
 * Handle get_deploys tool
 */
async function handleGetDeploys(renderClient: RenderClient, params: any) {
  const { serviceId, limit, cursor } = params;
  const deploys = await renderClient.getDeploys(serviceId, { limit, cursor });
  
  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(deploys, null, 2),
      },
    ],
  };
}

/**
 * Handle manage_env_vars tool
 */
async function handleManageEnvVars(renderClient: RenderClient, params: any) {
  const { serviceId, envVars } = params;
  const service = await renderClient.updateEnvVars(serviceId, envVars);
  
  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(service, null, 2),
      },
    ],
  };
}

/**
 * Handle manage_domains tool
 */
async function handleManageDomains(renderClient: RenderClient, params: any) {
  const { serviceId, action, domain } = params;
  
  switch (action) {
    case 'list': {
      const domains = await renderClient.listCustomDomains(serviceId);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(domains, null, 2),
          },
        ],
      };
    }
    
    case 'add': {
      if (!domain) {
        throw new Error('Domain name is required for add action');
      }
      
      const result = await renderClient.addCustomDomain(serviceId, domain);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    }
    
    case 'remove': {
      if (!domain) {
        throw new Error('Domain ID is required for remove action');
      }
      
      await renderClient.removeCustomDomain(serviceId, domain);
      return {
        content: [
          {
            type: 'text',
            text: `Domain ${domain} removed successfully from service ${serviceId}`,
          },
        ],
      };
    }
    
    default:
      throw new Error(`Unknown action: ${action}`);
  }
}

// ---------------------------------------------------------------------------
// Workspaces / owners
// ---------------------------------------------------------------------------

async function handleListWorkspaces(renderClient: RenderClient, params: any) {
  const { limit, cursor } = params || {};
  return jsonResult(await renderClient.listOwners({ limit, cursor }));
}

async function handleGetWorkspace(renderClient: RenderClient, params: any) {
  return jsonResult(await renderClient.getOwner(params.ownerId));
}

async function handleSelectWorkspace(renderClient: RenderClient, params: any) {
  const { ownerId } = params;
  // Validate the workspace exists before persisting the selection.
  const owner = await renderClient.getOwner(ownerId);
  await setSelectedOwnerId(ownerId);
  return jsonResult({ message: `Selected workspace ${ownerId}`, owner });
}

async function handleGetSelectedWorkspace() {
  const ownerId = await getSelectedOwnerId();
  return jsonResult(
    ownerId
      ? { selectedOwnerId: ownerId }
      : { selectedOwnerId: null, message: 'No workspace selected. Use select_workspace.' }
  );
}

// ---------------------------------------------------------------------------
// Granular service creation
//
// These build the nested serviceDetails payload the Render v1 create-service
// API expects, then delegate to the generic createService client method.
// Payload-shaping helpers live in ./createHelpers so they can be unit-tested.
// ---------------------------------------------------------------------------

async function handleCreateWebService(renderClient: RenderClient, params: any) {
  const ownerId = await resolveOwnerId(params.ownerId);
  const body = pruneUndefined({
    type: ServiceType.WEB_SERVICE,
    name: params.name,
    ownerId,
    repo: params.repo,
    branch: params.branch,
    autoDeploy: toAutoDeploy(params.autoDeploy),
    envVars: params.envVars,
    serviceDetails: {
      env: params.runtime || 'node',
      plan: params.plan,
      region: params.region,
      envSpecificDetails: buildEnvSpecificDetails(params.runtime, params.buildCommand, params.startCommand)
    }
  });
  return jsonResult(await renderClient.createService(body as any));
}

async function handleCreateStaticSite(renderClient: RenderClient, params: any) {
  const ownerId = await resolveOwnerId(params.ownerId);
  const body = pruneUndefined({
    type: ServiceType.STATIC_SITE,
    name: params.name,
    ownerId,
    repo: params.repo,
    branch: params.branch,
    autoDeploy: toAutoDeploy(params.autoDeploy),
    envVars: params.envVars,
    serviceDetails: {
      buildCommand: params.buildCommand,
      publishPath: params.publishPath
    }
  });
  return jsonResult(await renderClient.createService(body as any));
}

async function handleCreateCronJob(renderClient: RenderClient, params: any) {
  const ownerId = await resolveOwnerId(params.ownerId);
  const body = pruneUndefined({
    type: ServiceType.CRON_JOB,
    name: params.name,
    ownerId,
    repo: params.repo,
    branch: params.branch,
    envVars: params.envVars,
    serviceDetails: {
      env: params.runtime || 'node',
      plan: params.plan,
      region: params.region,
      schedule: params.schedule,
      envSpecificDetails: buildEnvSpecificDetails(params.runtime, params.buildCommand, params.startCommand)
    }
  });
  return jsonResult(await renderClient.createService(body as any));
}

// ---------------------------------------------------------------------------
// Logs
// ---------------------------------------------------------------------------

async function handleListLogs(renderClient: RenderClient, params: any) {
  const ownerId = await resolveOwnerId(params?.ownerId);
  return jsonResult(await renderClient.listLogs({ ...(params || {}), ownerId }));
}

async function handleListLogLabelValues(renderClient: RenderClient, params: any) {
  const ownerId = await resolveOwnerId(params?.ownerId);
  return jsonResult(await renderClient.listLogLabelValues(params.label, ownerId, params.resource));
}

// ---------------------------------------------------------------------------
// Datastores
// ---------------------------------------------------------------------------

async function handleListPostgres(renderClient: RenderClient, params: any) {
  const ownerId = params?.ownerId || (await getSelectedOwnerId().then(id => (id ? [id] : undefined)));
  return jsonResult(await renderClient.listPostgres({ ...(params || {}), ownerId }));
}

async function handleCreatePostgres(renderClient: RenderClient, params: any) {
  const ownerId = await resolveOwnerId(params.ownerId);
  return jsonResult(await renderClient.createPostgres({ ...params, ownerId }));
}

async function handleListKeyValue(renderClient: RenderClient, params: any) {
  const ownerId = params?.ownerId || (await getSelectedOwnerId().then(id => (id ? [id] : undefined)));
  return jsonResult(await renderClient.listKeyValue({ ...(params || {}), ownerId }));
}

async function handleCreateKeyValue(renderClient: RenderClient, params: any) {
  const ownerId = await resolveOwnerId(params.ownerId);
  return jsonResult(await renderClient.createKeyValue({ ...params, ownerId }));
}
