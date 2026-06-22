import { HealthController } from './health.controller';

describe('HealthController', () => {
  it('returns health status with correct structure', async () => {
    // Create a mock dataSource
    const mockDataSource = {
      isInitialized: jest.fn(),
    };
    
    // Create controller with mocked dataSource
    const controller = new HealthController(mockDataSource as any);
    
    const result = await controller.getHealth();
    
    // Check the structure of the response
    expect(result).toHaveProperty('status', 'ok');
    expect(result).toHaveProperty('timestamp');
    expect(typeof result.timestamp).toBe('string');
    expect(result).toHaveProperty('database');
    
    // Verify timestamp is valid ISO string
    const timestamp = new Date(result.timestamp);
    expect(timestamp.getTime()).not.toBeNaN();
  });
});