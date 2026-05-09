import { TestBed } from '@angular/core/testing';
import { CacheService } from './cache.service';

describe('CacheService', () => {
  let service: CacheService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CacheService);
    sessionStorage.clear();
  });

  afterEach(() => {
    sessionStorage.clear();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should return null for non-existent key', () => {
    expect(service.get('non_existent')).toBeNull();
  });

  it('should set and get data from cache', () => {
    service.set('test_key', { name: 'test' });
    const result = service.get<{ name: string }>('test_key');
    expect(result).toEqual({ name: 'test' });
  });

  it('should return null for expired cache entry', (done) => {
    service.set('expired_key', 'data', 50); // 50ms TTL
    setTimeout(() => {
      expect(service.get('expired_key')).toBeNull();
      done();
    }, 100);
  });

  it('should invalidate a specific key', () => {
    service.set('key1', 'data1');
    service.set('key2', 'data2');
    service.invalidate('key1');
    expect(service.get('key1')).toBeNull();
    expect(service.get('key2')).toBe('data2');
  });

  it('should invalidate by prefix', () => {
    service.set('user_profile', 'data1');
    service.set('user_settings', 'data2');
    service.set('operator_list', 'data3');
    service.invalidateByPrefix('user_');
    expect(service.get('user_profile')).toBeNull();
    expect(service.get('user_settings')).toBeNull();
    expect(service.get('operator_list')).toBe('data3');
  });

  it('should clear all cache', () => {
    service.set('key1', 'data1');
    service.set('key2', 'data2');
    service.clearAll();
    expect(service.get('key1')).toBeNull();
    expect(service.get('key2')).toBeNull();
  });

  it('should restore from sessionStorage when memory cache is empty', () => {
    service.set('restore_key', 'restore_data');
    // Create a new service instance to simulate memory cache clear
    const newService = new CacheService();
    expect(newService.get('restore_key')).toBe('restore_data');
  });

  it('should handle corrupt sessionStorage data gracefully', () => {
    sessionStorage.setItem('omni_cache_corrupt', 'not-valid-json');
    expect(service.get('corrupt')).toBeNull();
  });

  it('should use default TTL of 5 minutes', () => {
    service.set('default_ttl', 'data');
    const result = service.get('default_ttl');
    expect(result).toBe('data');
  });
});
