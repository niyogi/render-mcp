import { RenderClient, assertReadOnlySql } from '../src/renderClient';
import axios from 'axios';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('RenderClient', () => {
  let client: RenderClient;
  let mockAxiosInstance: any;
  const mockApiKey = 'test-api-key';
  
  // Mock axios.create before creating the client
  beforeEach(() => {
    // Create a mock axios instance with all required methods and properties
    mockAxiosInstance = {
      get: jest.fn(),
      post: jest.fn(),
      put: jest.fn(),
      delete: jest.fn(),
      interceptors: {
        request: {
          use: jest.fn()
        },
        response: {
          use: jest.fn()
        }
      }
    };
    
    // Mock the axios.create method to return our mock instance
    mockedAxios.create.mockReturnValue(mockAxiosInstance);
    
    // Now create the client
    client = new RenderClient(mockApiKey);
    jest.clearAllMocks();
  });

  describe('listServices', () => {
    it('should fetch services successfully', async () => {
      const mockServices = {
        data: [
          {
            id: 'srv-123',
            name: 'Test Service',
            type: 'web_service',
          },
        ],
        cursor: 'next-page',
      };

      // Set up the mock response
      mockAxiosInstance.get.mockResolvedValue({ data: mockServices });

      const result = await client.listServices({ limit: 10 });
      
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/services', { params: { limit: 10 } });
      expect(result).toEqual(mockServices);
    });
  });

  describe('getService', () => {
    it('should fetch a service by ID', async () => {
      const mockService = {
        data: {
          id: 'srv-123',
          name: 'Test Service',
          type: 'web_service',
        },
      };

      // Set up the mock response
      mockAxiosInstance.get.mockResolvedValue({ data: mockService });

      const result = await client.getService('srv-123');
      
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/services/srv-123');
      expect(result).toEqual(mockService.data);
    });
  });

  describe('deployService', () => {
    it('should deploy a service', async () => {
      const mockDeploy = {
        data: {
          id: 'dep-123',
          status: 'created',
        },
      };

      // Set up the mock response
      mockAxiosInstance.post.mockResolvedValue({ data: mockDeploy });

      const result = await client.deployService('srv-123', { clearCache: true });
      
      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/services/srv-123/deploys', { clearCache: true });
      expect(result).toEqual(mockDeploy.data);
    });
  });

  describe('testConnection', () => {
    it('should return true for successful connection', async () => {
      // Set up the mock response
      mockAxiosInstance.get.mockResolvedValue({ data: { data: [] } });

      const result = await client.testConnection();
      
      expect(mockAxiosInstance.get).toHaveBeenCalled();
      expect(result).toBe(true);
    });

    it('should return false for failed connection', async () => {
      // Set up the mock response
      mockAxiosInstance.get.mockRejectedValue(new Error('Connection failed'));

      const result = await client.testConnection();

      expect(mockAxiosInstance.get).toHaveBeenCalled();
      expect(result).toBe(false);
    });
  });

  describe('listOwners', () => {
    it('should list workspaces', async () => {
      const owners = [{ owner: { id: 'tea-1', name: 'My Team' } }];
      mockAxiosInstance.get.mockResolvedValue({ data: owners });

      const result = await client.listOwners({ limit: 5 });

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/owners', { params: { limit: 5 } });
      expect(result).toEqual(owners);
    });
  });

  describe('getDeploy', () => {
    it('should fetch a single deploy by id', async () => {
      const deploy = { id: 'dep-9', status: 'live' };
      mockAxiosInstance.get.mockResolvedValue({ data: deploy });

      const result = await client.getDeploy('srv-1', 'dep-9');

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/services/srv-1/deploys/dep-9');
      expect(result).toEqual(deploy);
    });
  });

  describe('cancelDeploy', () => {
    it('should POST to the cancel endpoint', async () => {
      mockAxiosInstance.post.mockResolvedValue({ data: { id: 'dep-9', status: 'canceled' } });

      await client.cancelDeploy('srv-1', 'dep-9');

      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/services/srv-1/deploys/dep-9/cancel');
    });
  });

  describe('restartService', () => {
    it('should POST to the restart endpoint', async () => {
      mockAxiosInstance.post.mockResolvedValue({ data: {} });

      const result = await client.restartService('srv-1');

      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/services/srv-1/restart');
      expect(result).toBe(true);
    });
  });

  describe('listLogs', () => {
    it('should pass filters through as query params', async () => {
      mockAxiosInstance.get.mockResolvedValue({ data: { logs: [] } });

      await client.listLogs({ ownerId: 'tea-1', resource: ['srv-1'], level: ['error'], limit: 10 });

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/logs', {
        params: { ownerId: 'tea-1', resource: ['srv-1'], level: ['error'], limit: 10 }
      });
    });
  });

  describe('getMetrics', () => {
    it('should fetch each metric type from its sub-endpoint', async () => {
      mockAxiosInstance.get.mockResolvedValue({ data: [{ time: 't', value: 1 }] });

      const result = await client.getMetrics({
        resourceId: 'srv-1',
        metricTypes: ['cpu_usage', 'memory_usage']
      });

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/metrics/cpu', { params: { resource: 'srv-1' } });
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/metrics/memory', { params: { resource: 'srv-1' } });
      expect(Object.keys(result)).toEqual(['cpu_usage', 'memory_usage']);
    });

    it('should report unknown metric types without calling the API', async () => {
      const result = await client.getMetrics({ resourceId: 'srv-1', metricTypes: ['bogus'] });

      expect(mockAxiosInstance.get).not.toHaveBeenCalled();
      expect(result.bogus.error).toContain('Unknown metric type');
    });
  });

  describe('listPostgres / listKeyValue', () => {
    it('should list postgres instances', async () => {
      mockAxiosInstance.get.mockResolvedValue({ data: [] });
      await client.listPostgres({ ownerId: ['tea-1'] });
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/postgres', { params: { ownerId: ['tea-1'] } });
    });

    it('should list key-value instances', async () => {
      mockAxiosInstance.get.mockResolvedValue({ data: [] });
      await client.listKeyValue({ ownerId: ['tea-1'] });
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/key-value', { params: { ownerId: ['tea-1'] } });
    });
  });

  describe('queryPostgres read-only guard', () => {
    it('should reject a write statement before touching the API', async () => {
      await expect(client.queryPostgres('pg-1', 'DELETE FROM users')).rejects.toThrow(/read-only/i);
      expect(mockAxiosInstance.get).not.toHaveBeenCalled();
    });

    it('should reject stacked statements', async () => {
      await expect(
        client.queryPostgres('pg-1', 'SELECT 1; DROP TABLE users')
      ).rejects.toThrow(/single SQL statement/i);
    });
  });
});

describe('create-service payload helpers', () => {
  const { toAutoDeploy, buildEnvSpecificDetails } = require('../src/createHelpers');

  it('maps autoDeploy boolean to Render\'s yes/no enum', () => {
    expect(toAutoDeploy(true)).toBe('yes');
    expect(toAutoDeploy(false)).toBe('no');
    expect(toAutoDeploy(undefined)).toBeUndefined();
  });

  it('uses buildCommand/startCommand for native runtimes', () => {
    expect(buildEnvSpecificDetails('node', 'npm run build', 'npm start')).toEqual({
      buildCommand: 'npm run build',
      startCommand: 'npm start'
    });
  });

  it('uses dockerCommand (not build/start) for the docker runtime', () => {
    expect(buildEnvSpecificDetails('docker', 'ignored', 'node server.js')).toEqual({
      dockerCommand: 'node server.js'
    });
  });
});

describe('assertReadOnlySql', () => {
  it('allows SELECT / WITH / EXPLAIN / SHOW', () => {
    expect(() => assertReadOnlySql('SELECT * FROM users')).not.toThrow();
    expect(() => assertReadOnlySql('  with x as (select 1) select * from x  ')).not.toThrow();
    expect(() => assertReadOnlySql('EXPLAIN SELECT 1')).not.toThrow();
    expect(() => assertReadOnlySql('SELECT 1;')).not.toThrow();
  });

  it('rejects writes, empty input, and stacked statements', () => {
    expect(() => assertReadOnlySql('')).toThrow(/empty/i);
    expect(() => assertReadOnlySql('DELETE FROM users')).toThrow(/read-only/i);
    expect(() => assertReadOnlySql('UPDATE users SET x = 1')).toThrow(/read-only/i);
    expect(() => assertReadOnlySql('DROP TABLE users')).toThrow(/read-only/i);
    expect(() => assertReadOnlySql('SELECT 1; DELETE FROM users')).toThrow(/single SQL statement/i);
  });
});
