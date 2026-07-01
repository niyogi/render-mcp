import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import {
  ApiResponse,
  CreateKeyValueRequest,
  CreatePostgresRequest,
  CreateServiceRequest,
  CustomDomain,
  DeployRequest,
  EnvVar,
  ListResourceParams,
  LogQueryParams,
  MetricsQueryParams,
  Owner,
  PaginatedResponse,
  PaginationParams,
  RenderDeploy,
  RenderService
} from './types/renderTypes.js';

/**
 * Maps the metric type names accepted by the get_metrics tool to their
 * corresponding Render metrics API sub-paths (GET /v1/metrics/{path}).
 */
const METRIC_TYPE_PATHS: Record<string, string> = {
  cpu_usage: 'cpu',
  cpu_limit: 'cpu-limit',
  cpu_target: 'cpu-target',
  memory_usage: 'memory',
  memory_limit: 'memory-limit',
  memory_target: 'memory-target',
  http_request_count: 'http-requests',
  http_latency: 'http-latency',
  bandwidth: 'bandwidth',
  instance_count: 'instance-count',
  active_connections: 'active-connections'
};

/**
 * Client for interacting with the Render API
 */
export class RenderClient {
  private client: AxiosInstance;
  private apiKey: string;

  /**
   * Create a new Render API client
   * @param apiKey Render API key
   */
  constructor(apiKey: string) {
    this.apiKey = apiKey;
    this.client = axios.create({
      baseURL: 'https://api.render.com/v1',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      // Render expects array query params as repeated keys (resource=a&resource=b),
      // not the bracketed form axios uses by default (resource[]=a).
      paramsSerializer: { indexes: null }
    });

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      response => response,
      error => {
        if (error.response) {
          // The request was made and the server responded with a status code
          // that falls out of the range of 2xx
          const { status, data } = error.response;
          const message = data?.message || 'Unknown error';
          
          throw new Error(`Render API error (${status}): ${message}`);
        } else if (error.request) {
          // The request was made but no response was received
          throw new Error('No response received from Render API');
        } else {
          // Something happened in setting up the request that triggered an Error
          throw new Error(`Error setting up request: ${error.message}`);
        }
      }
    );
  }

  /**
   * List all services
   * @param params Pagination parameters
   * @returns List of services
   */
  async listServices(params?: PaginationParams): Promise<PaginatedResponse<RenderService>> {
    const config: AxiosRequestConfig = {};
    if (params) {
      config.params = params;
    }
    
    const response = await this.client.get<PaginatedResponse<RenderService>>('/services', config);
    return response.data;
  }

  /**
   * Get a service by ID
   * @param serviceId Service ID
   * @returns Service details
   */
  async getService(serviceId: string): Promise<RenderService> {
    console.error(`Getting service details for ${serviceId}`);
    
    try {
      const response = await this.client.get<any>(`/services/${serviceId}`);
      
      console.error(`Service API response: ${JSON.stringify(response.data)}`);
      
      // Check if the response has the expected structure
      if (!response.data) {
        console.error('Service API response is missing data');
        throw new Error('Invalid response from Render API: missing data');
      }
      
      // If the response has a different structure than expected, try to adapt it
      if (!response.data.data) {
        console.error('Service API response has unexpected structure');
        
        // Try to extract service info from the response
        if (typeof response.data === 'object' && response.data.id) {
          return response.data as RenderService;
        }
        
        throw new Error('Invalid response from Render API: unexpected structure');
      }
      
      return response.data.data;
    } catch (error) {
      console.error(`Service API error: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Create a new service
   * @param service Service creation request
   * @returns Created service
   */
  async createService(service: CreateServiceRequest): Promise<RenderService> {
    const response = await this.client.post<ApiResponse<RenderService>>('/services', service);
    return response.data.data;
  }

  /**
   * Delete a service
   * @param serviceId Service ID
   * @returns Success status
   */
  async deleteService(serviceId: string): Promise<boolean> {
    await this.client.delete(`/services/${serviceId}`);
    return true;
  }

  /**
   * Deploy a service
   * @param serviceId Service ID
   * @param options Deploy options
   * @returns Deploy details
   */
  async deployService(serviceId: string, options?: DeployRequest): Promise<RenderDeploy> {
    console.error(`Deploying service ${serviceId} with options: ${JSON.stringify(options || {})}`);

    const response = await this.client.post<any>(
      `/services/${serviceId}/deploys`,
      options || {}
    );

    // Render returns the created deploy directly; tolerate a { data: ... } wrapper.
    // Errors are NOT swallowed — they propagate so callers report a real failure
    // rather than a fabricated success.
    const deploy = response.data?.data ?? response.data;
    if (!deploy || typeof deploy !== 'object') {
      throw new Error('Deploy request returned an unexpected response from the Render API');
    }
    return deploy as RenderDeploy;
  }

  /**
   * Get deploys for a service
   * @param serviceId Service ID
   * @param params Pagination parameters
   * @returns List of deploys
   */
  async getDeploys(serviceId: string, params?: PaginationParams): Promise<PaginatedResponse<RenderDeploy>> {
    const config: AxiosRequestConfig = {};
    if (params) {
      config.params = params;
    }
    
    const response = await this.client.get<PaginatedResponse<RenderDeploy>>(
      `/services/${serviceId}/deploys`,
      config
    );
    return response.data;
  }

  /**
   * Update environment variables for a service
   * @param serviceId Service ID
   * @param envVars Environment variables
   * @returns Updated service
   */
  async updateEnvVars(serviceId: string, envVars: EnvVar[]): Promise<RenderService> {
    const response = await this.client.put<ApiResponse<RenderService>>(
      `/services/${serviceId}/env-vars`,
      { envVars }
    );
    return response.data.data;
  }

  /**
   * List custom domains for a service
   * @param serviceId Service ID
   * @returns List of custom domains
   */
  async listCustomDomains(serviceId: string): Promise<CustomDomain[]> {
    const response = await this.client.get<ApiResponse<CustomDomain[]>>(
      `/services/${serviceId}/custom-domains`
    );
    return response.data.data;
  }

  /**
   * Add a custom domain to a service
   * @param serviceId Service ID
   * @param domain Domain name
   * @returns Added custom domain
   */
  async addCustomDomain(serviceId: string, domain: string): Promise<CustomDomain> {
    const response = await this.client.post<ApiResponse<CustomDomain>>(
      `/services/${serviceId}/custom-domains`,
      { name: domain }
    );
    return response.data.data;
  }

  /**
   * Remove a custom domain from a service
   * @param serviceId Service ID
   * @param domainId Domain ID
   * @returns Success status
   */
  async removeCustomDomain(serviceId: string, domainId: string): Promise<boolean> {
    await this.client.delete(`/services/${serviceId}/custom-domains/${domainId}`);
    return true;
  }

  // ---------------------------------------------------------------------------
  // Workspaces / owners
  // ---------------------------------------------------------------------------

  /**
   * List all workspaces (owners) accessible to the API key.
   * @param params Pagination parameters
   * @returns Raw API response (array of { owner, cursor } entries)
   */
  async listOwners(params?: PaginationParams): Promise<any> {
    const config: AxiosRequestConfig = params ? { params } : {};
    const response = await this.client.get('/owners', config);
    return response.data;
  }

  /**
   * Get a single workspace (owner) by ID.
   * @param ownerId Owner ID
   * @returns Owner details
   */
  async getOwner(ownerId: string): Promise<Owner> {
    const response = await this.client.get<Owner>(`/owners/${ownerId}`);
    return response.data;
  }

  // ---------------------------------------------------------------------------
  // Deploys
  // ---------------------------------------------------------------------------

  /**
   * Get a single deploy by ID.
   * @param serviceId Service ID
   * @param deployId Deploy ID
   * @returns Deploy details
   */
  async getDeploy(serviceId: string, deployId: string): Promise<RenderDeploy> {
    const response = await this.client.get<RenderDeploy>(
      `/services/${serviceId}/deploys/${deployId}`
    );
    return response.data;
  }

  /**
   * Cancel an in-progress deploy.
   * @param serviceId Service ID
   * @param deployId Deploy ID
   * @returns Raw API response
   */
  async cancelDeploy(serviceId: string, deployId: string): Promise<any> {
    const response = await this.client.post(
      `/services/${serviceId}/deploys/${deployId}/cancel`
    );
    return response.data;
  }

  // ---------------------------------------------------------------------------
  // Services (mutating extras)
  // ---------------------------------------------------------------------------

  /**
   * Restart a running service without triggering a new build/deploy.
   * @param serviceId Service ID
   * @returns Success status
   */
  async restartService(serviceId: string): Promise<boolean> {
    await this.client.post(`/services/${serviceId}/restart`);
    return true;
  }

  // ---------------------------------------------------------------------------
  // Logs
  // ---------------------------------------------------------------------------

  /**
   * List logs for the given workspace, filtered by resource/level/etc.
   * @param params Log query params (ownerId required)
   * @returns Raw logs API response ({ logs, hasMore, nextStartTime, ... })
   */
  async listLogs(params: LogQueryParams): Promise<any> {
    const response = await this.client.get('/logs', { params });
    return response.data;
  }

  /**
   * List the available values for a given log label (e.g. "level", "type").
   * @param label Label to enumerate values for
   * @param ownerId Owner/workspace ID
   * @param resource Optional resource IDs to scope the values to
   * @returns Raw API response (array of label values)
   */
  async listLogLabelValues(label: string, ownerId: string, resource?: string[]): Promise<any> {
    const response = await this.client.get('/logs/values', {
      params: { label, ownerId, resource }
    });
    return response.data;
  }

  // ---------------------------------------------------------------------------
  // Metrics
  // ---------------------------------------------------------------------------

  /**
   * Fetch one or more metric series for a resource. Each requested metric type
   * maps to a Render metrics sub-endpoint; results are merged into one object
   * keyed by metric type. Unknown metric types are reported in the result.
   * @param params Metrics query params
   * @returns Object keyed by metric type with the series data (or an error string)
   */
  async getMetrics(params: MetricsQueryParams): Promise<Record<string, any>> {
    const { resourceId, metricTypes, startTime, endTime, resolutionSeconds } = params;
    const baseParams: Record<string, any> = { resource: resourceId };
    if (startTime) baseParams.startTime = startTime;
    if (endTime) baseParams.endTime = endTime;
    if (resolutionSeconds) baseParams.resolutionSeconds = resolutionSeconds;

    const results: Record<string, any> = {};
    for (const metricType of metricTypes) {
      const subPath = METRIC_TYPE_PATHS[metricType];
      if (!subPath) {
        results[metricType] = { error: `Unknown metric type. Valid types: ${Object.keys(METRIC_TYPE_PATHS).join(', ')}` };
        continue;
      }
      try {
        const response = await this.client.get(`/metrics/${subPath}`, { params: baseParams });
        results[metricType] = response.data;
      } catch (error) {
        results[metricType] = { error: error instanceof Error ? error.message : String(error) };
      }
    }
    return results;
  }

  // ---------------------------------------------------------------------------
  // Postgres
  // ---------------------------------------------------------------------------

  /**
   * List Render Postgres instances.
   * @param params Optional owner/pagination filters
   * @returns Raw API response
   */
  async listPostgres(params?: ListResourceParams): Promise<any> {
    const config: AxiosRequestConfig = params ? { params } : {};
    const response = await this.client.get('/postgres', config);
    return response.data;
  }

  /**
   * Get a single Postgres instance by ID.
   * @param postgresId Postgres instance ID
   * @returns Postgres details
   */
  async getPostgres(postgresId: string): Promise<any> {
    const response = await this.client.get(`/postgres/${postgresId}`);
    return response.data;
  }

  /**
   * Create a new Render Postgres instance.
   * @param request Create request
   * @returns Created Postgres instance
   */
  async createPostgres(request: CreatePostgresRequest): Promise<any> {
    const response = await this.client.post('/postgres', request);
    return response.data;
  }

  /**
   * Run a READ-ONLY SQL query against a Render Postgres instance. The statement
   * is validated to be a single read (SELECT/WITH/EXPLAIN/SHOW) and executed
   * inside a READ ONLY transaction as a defense-in-depth guardrail.
   * @param postgresId Postgres instance ID
   * @param sql SQL query to run (read-only)
   * @returns Query result rows and metadata
   */
  async queryPostgres(postgresId: string, sql: string): Promise<any> {
    assertReadOnlySql(sql);

    // Fetch connection details for the instance.
    const infoResponse = await this.client.get(`/postgres/${postgresId}/connection-info`);
    const info = infoResponse.data || {};
    const connectionString: string | undefined =
      info.externalConnectionString || info.internalConnectionString;
    if (!connectionString) {
      throw new Error('Could not obtain a connection string for this Postgres instance');
    }

    // Lazily import pg so the server still runs for users who never query.
    // The specifier is cast to any so the build does not require pg's types to
    // be present until the dependency is actually installed.
    let pg: any;
    try {
      pg = (await import('pg' as any)).default;
    } catch {
      throw new Error(
        "The 'pg' package is required for query_render_postgres. Run `npm install` to enable it."
      );
    }
    // Verify the server's TLS certificate by default — the connection carries
    // DB credentials and result data. Render's external endpoints present valid
    // certs. Allow an explicit, deliberate opt-out for unusual setups.
    const verifyTls = process.env.RENDER_PG_SSL_NO_VERIFY !== 'true';
    const client = new pg.Client({
      connectionString,
      ssl: { rejectUnauthorized: verifyTls }
    });

    await client.connect();
    try {
      await client.query('BEGIN TRANSACTION READ ONLY');
      const result = await client.query(sql);
      await client.query('ROLLBACK');
      return {
        rowCount: result.rowCount,
        fields: result.fields?.map((f: any) => f.name),
        rows: result.rows
      };
    } finally {
      await client.end();
    }
  }

  // ---------------------------------------------------------------------------
  // Key Value (Redis)
  // ---------------------------------------------------------------------------

  /**
   * List Render Key Value (Redis) instances.
   * @param params Optional owner/pagination filters
   * @returns Raw API response
   */
  async listKeyValue(params?: ListResourceParams): Promise<any> {
    const config: AxiosRequestConfig = params ? { params } : {};
    const response = await this.client.get('/key-value', config);
    return response.data;
  }

  /**
   * Get a single Key Value instance by ID.
   * @param keyValueId Key Value instance ID
   * @returns Key Value details
   */
  async getKeyValue(keyValueId: string): Promise<any> {
    const response = await this.client.get(`/key-value/${keyValueId}`);
    return response.data;
  }

  /**
   * Create a new Render Key Value (Redis) instance.
   * @param request Create request
   * @returns Created Key Value instance
   */
  async createKeyValue(request: CreateKeyValueRequest): Promise<any> {
    const response = await this.client.post('/key-value', request);
    return response.data;
  }

  /**
   * Test the API connection
   * @returns True if connection is successful
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.listServices({ limit: 1 });
      return true;
    } catch (error) {
      return false;
    }
  }
}

/**
 * Validate that a SQL string is a single, read-only statement. Throws if the
 * query is empty, contains multiple statements, or starts with anything other
 * than a read keyword (SELECT, WITH, EXPLAIN, SHOW, TABLE, VALUES).
 * @param sql SQL to validate
 */
export function assertReadOnlySql(sql: string): void {
  const trimmed = (sql || '').trim();
  if (!trimmed) {
    throw new Error('SQL query is empty');
  }

  // Strip a single trailing semicolon, then reject anything with an embedded
  // statement separator to block stacked queries (e.g. "SELECT 1; DROP ...").
  const withoutTrailing = trimmed.replace(/;\s*$/, '');
  if (withoutTrailing.includes(';')) {
    throw new Error('Only a single SQL statement is allowed for read-only queries');
  }

  const firstKeyword = withoutTrailing.split(/\s+/)[0]?.toUpperCase();
  const allowed = ['SELECT', 'WITH', 'EXPLAIN', 'SHOW', 'TABLE', 'VALUES'];
  if (!firstKeyword || !allowed.includes(firstKeyword)) {
    throw new Error(
      `Only read-only queries are permitted (must start with one of: ${allowed.join(', ')}). ` +
      `Received a statement starting with "${firstKeyword}".`
    );
  }
}
