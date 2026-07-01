/**
 * JSON Schema definitions for MCP tool inputs
 */

export const listServicesSchema = {
  type: "object",
  properties: {
    params: {
      type: "object",
      properties: {
        limit: {
          type: "number",
          description: "Number of services to return (default: 20, max: 100)"
        },
        cursor: {
          type: "string",
          description: "Pagination cursor for fetching next page"
        }
      },
      additionalProperties: false
    }
  },
  required: ["params"],
  additionalProperties: false
};

export const getServiceSchema = {
  type: "object",
  properties: {
    params: {
      type: "object",
      properties: {
        serviceId: {
          type: "string",
          description: "The ID of the service to retrieve"
        }
      },
      required: ["serviceId"],
      additionalProperties: false
    }
  },
  required: ["params"],
  additionalProperties: false
};

export const deployServiceSchema = {
  type: "object",
  properties: {
    params: {
      type: "object",
      properties: {
        serviceId: {
          type: "string",
          description: "The ID of the service to deploy"
        },
        clearCache: {
          type: "boolean",
          description: "Whether to clear cache before deploy (default: false)"
        }
      },
      required: ["serviceId"],
      additionalProperties: false
    }
  },
  required: ["params"],
  additionalProperties: false
};

export const createServiceSchema = {
  type: "object",
  properties: {
    params: {
      type: "object",
      properties: {
        type: {
          type: "string",
          enum: ["web_service", "static_site", "private_service", "background_worker", "cron_job"],
          description: "Type of service to create"
        },
        name: {
          type: "string",
          description: "Name of the service"
        },
        ownerId: {
          type: "string",
          description: "ID of the owner (user or team)"
        },
        repo: {
          type: "string",
          description: "URL of the repo to deploy from"
        },
        branch: {
          type: "string",
          description: "Branch to deploy (default: main)"
        },
        envVars: {
          type: "array",
          items: {
            type: "object",
            properties: {
              key: { type: "string" },
              value: { type: "string" }
            },
            required: ["key", "value"]
          },
          description: "Environment variables for the service"
        },
        buildCommand: {
          type: "string",
          description: "Command to build the service"
        },
        startCommand: {
          type: "string",
          description: "Command to start the service (web services only)"
        },
        publishPath: {
          type: "string",
          description: "Path to publish (static sites only)"
        },
        plan: {
          type: "string",
          enum: ["free", "starter", "starter_plus", "standard", "standard_plus", "pro", "pro_plus"],
          description: "Service plan (default: free)"
        },
        region: {
          type: "string",
          description: "Region to deploy to"
        },
        numInstances: {
          type: "number",
          description: "Number of instances (default: 1)"
        },
        autoDeploy: {
          type: "boolean",
          description: "Whether to auto-deploy on push (default: true)"
        }
      },
      required: ["type", "name", "ownerId", "repo"],
      additionalProperties: false
    }
  },
  required: ["params"],
  additionalProperties: false
};

export const deleteServiceSchema = {
  type: "object",
  properties: {
    params: {
      type: "object",
      properties: {
        serviceId: {
          type: "string",
          description: "The ID of the service to delete"
        }
      },
      required: ["serviceId"],
      additionalProperties: false
    }
  },
  required: ["params"],
  additionalProperties: false
};

export const getDeploysSchema = {
  type: "object",
  properties: {
    params: {
      type: "object",
      properties: {
        serviceId: {
          type: "string",
          description: "The ID of the service to get deploys for"
        },
        limit: {
          type: "number",
          description: "Number of deploys to return (default: 20, max: 100)"
        },
        cursor: {
          type: "string",
          description: "Pagination cursor for fetching next page"
        }
      },
      required: ["serviceId"],
      additionalProperties: false
    }
  },
  required: ["params"],
  additionalProperties: false
};

export const manageEnvVarsSchema = {
  type: "object",
  properties: {
    params: {
      type: "object",
      properties: {
        serviceId: {
          type: "string",
          description: "The ID of the service to manage env vars for"
        },
        envVars: {
          type: "array",
          items: {
            type: "object",
            properties: {
              key: { type: "string" },
              value: { type: "string" }
            },
            required: ["key", "value"]
          },
          description: "Environment variables to set"
        }
      },
      required: ["serviceId", "envVars"],
      additionalProperties: false
    }
  },
  required: ["params"],
  additionalProperties: false
};

export const manageDomainsSchema = {
  type: "object",
  properties: {
    params: {
      type: "object",
      properties: {
        serviceId: {
          type: "string",
          description: "The ID of the service to manage domains for"
        },
        action: {
          type: "string",
          enum: ["add", "remove", "list"],
          description: "Action to perform"
        },
        domain: {
          type: "string",
          description: "Domain name (required for add/remove)"
        }
      },
      required: ["serviceId", "action"],
      additionalProperties: false
    }
  },
  required: ["params"],
  additionalProperties: false
};

// ---------------------------------------------------------------------------
// Workspaces / owners
// ---------------------------------------------------------------------------

export const listWorkspacesSchema = {
  type: "object",
  properties: {
    params: {
      type: "object",
      properties: {
        limit: { type: "number", description: "Number of workspaces to return (default: 20)" },
        cursor: { type: "string", description: "Pagination cursor" }
      },
      additionalProperties: false
    }
  },
  additionalProperties: false
};

export const getWorkspaceSchema = {
  type: "object",
  properties: {
    params: {
      type: "object",
      properties: {
        ownerId: { type: "string", description: "The ID of the workspace/owner to retrieve" }
      },
      required: ["ownerId"],
      additionalProperties: false
    }
  },
  required: ["params"],
  additionalProperties: false
};

export const selectWorkspaceSchema = {
  type: "object",
  properties: {
    params: {
      type: "object",
      properties: {
        ownerId: {
          type: "string",
          description: "The workspace/owner ID to select as the default for subsequent tools"
        }
      },
      required: ["ownerId"],
      additionalProperties: false
    }
  },
  required: ["params"],
  additionalProperties: false
};

export const getSelectedWorkspaceSchema = {
  type: "object",
  properties: {},
  additionalProperties: false
};

// ---------------------------------------------------------------------------
// Deploys
// ---------------------------------------------------------------------------

export const getDeploySchema = {
  type: "object",
  properties: {
    params: {
      type: "object",
      properties: {
        serviceId: { type: "string", description: "The ID of the service" },
        deployId: { type: "string", description: "The ID of the deploy to retrieve" }
      },
      required: ["serviceId", "deployId"],
      additionalProperties: false
    }
  },
  required: ["params"],
  additionalProperties: false
};

export const cancelDeploySchema = {
  type: "object",
  properties: {
    params: {
      type: "object",
      properties: {
        serviceId: { type: "string", description: "The ID of the service" },
        deployId: { type: "string", description: "The ID of the deploy to cancel" }
      },
      required: ["serviceId", "deployId"],
      additionalProperties: false
    }
  },
  required: ["params"],
  additionalProperties: false
};

// ---------------------------------------------------------------------------
// Services (mutating extras + granular creates)
// ---------------------------------------------------------------------------

export const restartServiceSchema = {
  type: "object",
  properties: {
    params: {
      type: "object",
      properties: {
        serviceId: { type: "string", description: "The ID of the service to restart" }
      },
      required: ["serviceId"],
      additionalProperties: false
    }
  },
  required: ["params"],
  additionalProperties: false
};

const envVarsProperty = {
  type: "array",
  items: {
    type: "object",
    properties: {
      key: { type: "string" },
      value: { type: "string" }
    },
    required: ["key", "value"]
  },
  description: "Environment variables for the service"
};

export const createWebServiceSchema = {
  type: "object",
  properties: {
    params: {
      type: "object",
      properties: {
        name: { type: "string", description: "Name of the web service" },
        ownerId: { type: "string", description: "Workspace/owner ID (defaults to the selected workspace)" },
        repo: { type: "string", description: "URL of the git repo to deploy from" },
        branch: { type: "string", description: "Branch to deploy (default: main)" },
        runtime: {
          type: "string",
          enum: ["node", "python", "go", "rust", "ruby", "elixir", "docker"],
          description: "Runtime environment (default: node)"
        },
        buildCommand: { type: "string", description: "Command to build the service" },
        startCommand: { type: "string", description: "Command to start the service" },
        plan: { type: "string", description: "Service plan (default: starter)" },
        region: { type: "string", description: "Region to deploy to (e.g. oregon, frankfurt)" },
        envVars: envVarsProperty,
        autoDeploy: { type: "boolean", description: "Auto-deploy on push (default: true)" }
      },
      required: ["name", "repo"],
      additionalProperties: false
    }
  },
  required: ["params"],
  additionalProperties: false
};

export const createStaticSiteSchema = {
  type: "object",
  properties: {
    params: {
      type: "object",
      properties: {
        name: { type: "string", description: "Name of the static site" },
        ownerId: { type: "string", description: "Workspace/owner ID (defaults to the selected workspace)" },
        repo: { type: "string", description: "URL of the git repo to deploy from" },
        branch: { type: "string", description: "Branch to deploy (default: main)" },
        buildCommand: { type: "string", description: "Command to build the site" },
        publishPath: { type: "string", description: "Directory to publish (e.g. ./dist)" },
        envVars: envVarsProperty,
        autoDeploy: { type: "boolean", description: "Auto-deploy on push (default: true)" }
      },
      required: ["name", "repo"],
      additionalProperties: false
    }
  },
  required: ["params"],
  additionalProperties: false
};

export const createCronJobSchema = {
  type: "object",
  properties: {
    params: {
      type: "object",
      properties: {
        name: { type: "string", description: "Name of the cron job" },
        ownerId: { type: "string", description: "Workspace/owner ID (defaults to the selected workspace)" },
        repo: { type: "string", description: "URL of the git repo to deploy from" },
        branch: { type: "string", description: "Branch to deploy (default: main)" },
        runtime: {
          type: "string",
          enum: ["node", "python", "go", "rust", "ruby", "elixir", "docker"],
          description: "Runtime environment (default: node)"
        },
        schedule: { type: "string", description: "Cron schedule expression (e.g. '0 * * * *')" },
        buildCommand: { type: "string", description: "Command to build the job" },
        startCommand: { type: "string", description: "Command the cron job runs" },
        plan: { type: "string", description: "Service plan (default: starter)" },
        region: { type: "string", description: "Region to deploy to" },
        envVars: envVarsProperty
      },
      required: ["name", "repo", "schedule", "startCommand"],
      additionalProperties: false
    }
  },
  required: ["params"],
  additionalProperties: false
};

// ---------------------------------------------------------------------------
// Logs
// ---------------------------------------------------------------------------

const stringArray = (description: string) => ({
  type: "array",
  items: { type: "string" },
  description
});

export const listLogsSchema = {
  type: "object",
  properties: {
    params: {
      type: "object",
      properties: {
        ownerId: { type: "string", description: "Workspace/owner ID (defaults to the selected workspace)" },
        resource: stringArray("Resource IDs (e.g. service IDs) to fetch logs for"),
        level: stringArray("Log levels to filter by (e.g. info, warning, error)"),
        type: stringArray("Log types to filter by (e.g. app, request, build)"),
        instance: stringArray("Instance IDs to filter by"),
        text: stringArray("Substrings that must appear in the log text"),
        host: stringArray("Request host filter (request logs)"),
        statusCode: stringArray("HTTP status code filter (request logs)"),
        method: stringArray("HTTP method filter (request logs)"),
        path: stringArray("Request path filter (request logs)"),
        startTime: { type: "string", description: "ISO8601 start time" },
        endTime: { type: "string", description: "ISO8601 end time" },
        direction: { type: "string", enum: ["backward", "forward"], description: "Search direction (default: backward)" },
        limit: { type: "number", description: "Max number of log lines (default: 20, max: 100)" }
      },
      additionalProperties: false
    }
  },
  additionalProperties: false
};

export const listLogLabelValuesSchema = {
  type: "object",
  properties: {
    params: {
      type: "object",
      properties: {
        label: { type: "string", description: "The log label to enumerate values for (e.g. 'level', 'type', 'host')" },
        ownerId: { type: "string", description: "Workspace/owner ID (defaults to the selected workspace)" },
        resource: stringArray("Optional resource IDs to scope the values to")
      },
      required: ["label"],
      additionalProperties: false
    }
  },
  required: ["params"],
  additionalProperties: false
};

// ---------------------------------------------------------------------------
// Metrics
// ---------------------------------------------------------------------------

export const getMetricsSchema = {
  type: "object",
  properties: {
    params: {
      type: "object",
      properties: {
        resourceId: { type: "string", description: "The resource ID (service, Postgres, or key-value) to fetch metrics for" },
        metricTypes: {
          type: "array",
          items: {
            type: "string",
            enum: [
              "cpu_usage", "cpu_limit", "cpu_target",
              "memory_usage", "memory_limit", "memory_target",
              "http_request_count", "http_latency", "bandwidth",
              "instance_count", "active_connections"
            ]
          },
          description: "Which metrics to fetch"
        },
        startTime: { type: "string", description: "ISO8601 start time" },
        endTime: { type: "string", description: "ISO8601 end time" },
        resolutionSeconds: { type: "number", description: "Data point resolution in seconds" }
      },
      required: ["resourceId", "metricTypes"],
      additionalProperties: false
    }
  },
  required: ["params"],
  additionalProperties: false
};

// ---------------------------------------------------------------------------
// Postgres
// ---------------------------------------------------------------------------

export const listPostgresSchema = {
  type: "object",
  properties: {
    params: {
      type: "object",
      properties: {
        ownerId: stringArray("Workspace/owner IDs to filter by (defaults to the selected workspace)"),
        limit: { type: "number", description: "Number of instances to return" },
        cursor: { type: "string", description: "Pagination cursor" }
      },
      additionalProperties: false
    }
  },
  additionalProperties: false
};

export const getPostgresSchema = {
  type: "object",
  properties: {
    params: {
      type: "object",
      properties: {
        postgresId: { type: "string", description: "The ID of the Postgres instance" }
      },
      required: ["postgresId"],
      additionalProperties: false
    }
  },
  required: ["params"],
  additionalProperties: false
};

export const createPostgresSchema = {
  type: "object",
  properties: {
    params: {
      type: "object",
      properties: {
        name: { type: "string", description: "Name of the Postgres instance" },
        ownerId: { type: "string", description: "Workspace/owner ID (defaults to the selected workspace)" },
        plan: { type: "string", description: "Postgres plan (e.g. free, basic_256mb, pro)" },
        region: { type: "string", description: "Region (e.g. oregon, frankfurt)" },
        version: { type: "string", description: "Postgres major version (e.g. '16')" },
        databaseName: { type: "string", description: "Initial database name" },
        databaseUser: { type: "string", description: "Initial database user" },
        diskSizeGB: { type: "number", description: "Disk size in GB" },
        highAvailabilityEnabled: { type: "boolean", description: "Enable high availability" }
      },
      required: ["name", "plan"],
      additionalProperties: false
    }
  },
  required: ["params"],
  additionalProperties: false
};

export const queryRenderPostgresSchema = {
  type: "object",
  properties: {
    params: {
      type: "object",
      properties: {
        postgresId: { type: "string", description: "The ID of the Postgres instance to query" },
        sql: {
          type: "string",
          description: "A single READ-ONLY SQL statement (SELECT/WITH/EXPLAIN/SHOW). Writes are rejected."
        }
      },
      required: ["postgresId", "sql"],
      additionalProperties: false
    }
  },
  required: ["params"],
  additionalProperties: false
};

// ---------------------------------------------------------------------------
// Key Value (Redis)
// ---------------------------------------------------------------------------

export const listKeyValueSchema = {
  type: "object",
  properties: {
    params: {
      type: "object",
      properties: {
        ownerId: stringArray("Workspace/owner IDs to filter by (defaults to the selected workspace)"),
        limit: { type: "number", description: "Number of instances to return" },
        cursor: { type: "string", description: "Pagination cursor" }
      },
      additionalProperties: false
    }
  },
  additionalProperties: false
};

export const getKeyValueSchema = {
  type: "object",
  properties: {
    params: {
      type: "object",
      properties: {
        keyValueId: { type: "string", description: "The ID of the Key Value instance" }
      },
      required: ["keyValueId"],
      additionalProperties: false
    }
  },
  required: ["params"],
  additionalProperties: false
};

export const createKeyValueSchema = {
  type: "object",
  properties: {
    params: {
      type: "object",
      properties: {
        name: { type: "string", description: "Name of the Key Value instance" },
        ownerId: { type: "string", description: "Workspace/owner ID (defaults to the selected workspace)" },
        plan: { type: "string", description: "Key Value plan (e.g. free, starter, standard)" },
        region: { type: "string", description: "Region (e.g. oregon, frankfurt)" },
        maxmemoryPolicy: { type: "string", description: "Eviction policy (e.g. allkeys_lru, noeviction)" }
      },
      required: ["name", "plan"],
      additionalProperties: false
    }
  },
  required: ["params"],
  additionalProperties: false
};
