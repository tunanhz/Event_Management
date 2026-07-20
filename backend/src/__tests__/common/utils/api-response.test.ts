import { ApiResponse } from '../../../common/utils/ApiResponse';

describe('ApiResponse', () => {
  describe('constructor', () => {
    it('should create an ApiResponse with all fields', () => {
      const data = { id: 1, name: 'test' };
      const meta = { totalCount: 100 };
      const response = new ApiResponse(true, 'Success', data, meta);

      expect(response.success).toBe(true);
      expect(response.message).toBe('Success');
      expect(response.data).toEqual(data);
      expect(response.meta).toEqual(meta);
    });

    it('should create an ApiResponse with undefined data and meta', () => {
      const response = new ApiResponse(false, 'Error');

      expect(response.success).toBe(false);
      expect(response.message).toBe('Error');
      expect(response.data).toBeUndefined();
      expect(response.meta).toBeUndefined();
    });

    it('should create an ApiResponse with only data (no meta)', () => {
      const data = { id: 1 };
      const response = new ApiResponse(true, 'OK', data);

      expect(response.success).toBe(true);
      expect(response.message).toBe('OK');
      expect(response.data).toEqual(data);
      expect(response.meta).toBeUndefined();
    });
  });

  describe('static ok() factory', () => {
    it('should create a success response with default message', () => {
      const data = { userId: 123 };
      const response = ApiResponse.ok(data);

      expect(response.success).toBe(true);
      expect(response.message).toBe('Success');
      expect(response.data).toEqual(data);
      expect(response.meta).toBeUndefined();
    });

    it('should create a success response with custom message', () => {
      const data = { userId: 123 };
      const response = ApiResponse.ok(data, 'User retrieved');

      expect(response.success).toBe(true);
      expect(response.message).toBe('User retrieved');
      expect(response.data).toEqual(data);
    });

    it('should create a success response with data, message, and meta', () => {
      const data = [{ id: 1 }, { id: 2 }];
      const meta = { page: 1, limit: 10, total: 100 };
      const response = ApiResponse.ok(data, 'Users list', meta);

      expect(response.success).toBe(true);
      expect(response.message).toBe('Users list');
      expect(response.data).toEqual(data);
      expect(response.meta).toEqual(meta);
    });

    it('should work with null data', () => {
      const response = ApiResponse.ok(null, 'No data');

      expect(response.success).toBe(true);
      expect(response.data).toBeNull();
      expect(response.message).toBe('No data');
    });

    it('should work with empty array data', () => {
      const response = ApiResponse.ok([]);

      expect(response.success).toBe(true);
      expect(response.data).toEqual([]);
    });

    it('should preserve complex nested objects', () => {
      const data = {
        user: {
          id: 1,
          profile: {
            name: 'John',
            contacts: [{ email: 'john@example.com' }],
          },
        },
      };
      const response = ApiResponse.ok(data);

      expect(response.data).toEqual(data);
      expect(response.data.user.profile.contacts[0].email).toBe('john@example.com');
    });
  });

  describe('static created() factory', () => {
    it('should create a success response with default created message', () => {
      const data = { id: 1, name: 'new item' };
      const response = ApiResponse.created(data);

      expect(response.success).toBe(true);
      expect(response.message).toBe('Created successfully');
      expect(response.data).toEqual(data);
      expect(response.meta).toBeUndefined();
    });

    it('should create a success response with custom created message', () => {
      const data = { id: 1, name: 'new event' };
      const response = ApiResponse.created(data, 'Event created with success');

      expect(response.success).toBe(true);
      expect(response.message).toBe('Event created with success');
      expect(response.data).toEqual(data);
    });

    it('should NOT include meta in created response', () => {
      const data = { id: 1 };
      const response = ApiResponse.created(data);

      expect(response.meta).toBeUndefined();
    });

    it('should work with null data', () => {
      const response = ApiResponse.created(null);

      expect(response.success).toBe(true);
      expect(response.data).toBeNull();
    });

    it('should work with array data', () => {
      const data = [{ id: 1 }, { id: 2 }];
      const response = ApiResponse.created(data);

      expect(response.data).toEqual(data);
    });
  });

  describe('static error() factory', () => {
    it('should create an error response with default message', () => {
      const response = ApiResponse.error();

      expect(response.success).toBe(false);
      expect(response.message).toBe('Something went wrong');
      expect(response.data).toBeUndefined();
      expect(response.meta).toBeUndefined();
    });

    it('should create an error response with custom message', () => {
      const response = ApiResponse.error('User not found');

      expect(response.success).toBe(false);
      expect(response.message).toBe('User not found');
      expect(response.data).toBeUndefined();
    });

    it('should create an error response with Vietnamese message', () => {
      const response = ApiResponse.error('Tài khoản không tồn tại');

      expect(response.success).toBe(false);
      expect(response.message).toBe('Tài khoản không tồn tại');
    });

    it('should NOT include data or meta in error response', () => {
      const response = ApiResponse.error('Error occurred');

      expect(response.data).toBeUndefined();
      expect(response.meta).toBeUndefined();
    });
  });

  describe('generic typing', () => {
    it('should work with typed data', () => {
      interface User {
        id: number;
        email: string;
      }

      const user: User = { id: 1, email: 'test@example.com' };
      const response: ApiResponse<User> = ApiResponse.ok(user);

      expect(response.data?.id).toBe(1);
      expect(response.data?.email).toBe('test@example.com');
    });

    it('should work with array types', () => {
      interface Item {
        id: number;
      }

      const items: Item[] = [{ id: 1 }, { id: 2 }];
      const response: ApiResponse<Item[]> = ApiResponse.ok(items);

      expect(response.data).toHaveLength(2);
      expect(response.data?.[0].id).toBe(1);
    });
  });

  describe('meta field handling', () => {
    it('should accept arbitrary meta fields', () => {
      const meta = {
        page: 1,
        limit: 10,
        total: 100,
        customField: 'custom value',
        nestedMeta: { key: 'value' },
      };
      const response = ApiResponse.ok({ id: 1 }, 'OK', meta);

      expect(response.meta).toEqual(meta);
      expect(response.meta?.page).toBe(1);
      expect(response.meta?.customField).toBe('custom value');
      expect(response.meta?.nestedMeta.key).toBe('value');
    });

    it('should handle empty meta object', () => {
      const response = ApiResponse.ok({ id: 1 }, 'OK', {});

      expect(response.meta).toEqual({});
    });
  });

  describe('data field with various types', () => {
    it('should work with string data', () => {
      const response = ApiResponse.ok('success message');

      expect(response.data).toBe('success message');
      expect(typeof response.data).toBe('string');
    });

    it('should work with number data', () => {
      const response = ApiResponse.ok(42);

      expect(response.data).toBe(42);
      expect(typeof response.data).toBe('number');
    });

    it('should work with boolean data', () => {
      const response = ApiResponse.ok(true);

      expect(response.data).toBe(true);
    });

    it('should work with object data', () => {
      const obj = { key: 'value', nested: { inner: 'data' } };
      const response = ApiResponse.ok(obj);

      expect(response.data).toEqual(obj);
    });

    it('should work with array data', () => {
      const arr = [1, 2, 3, 'four', { five: 5 }];
      const response = ApiResponse.ok(arr);

      expect(response.data).toEqual(arr);
      expect(response.data).toHaveLength(5);
    });
  });

  describe('default message values', () => {
    it('ok() should use "Success" as default message', () => {
      const response = ApiResponse.ok({});

      expect(response.message).toBe('Success');
    });

    it('created() should use "Created successfully" as default message', () => {
      const response = ApiResponse.created({});

      expect(response.message).toBe('Created successfully');
    });

    it('error() should use "Something went wrong" as default message', () => {
      const response = ApiResponse.error();

      expect(response.message).toBe('Something went wrong');
    });
  });

  describe('instanceof checks', () => {
    it('should be an instance of ApiResponse', () => {
      const response = ApiResponse.ok({ id: 1 });

      expect(response instanceof ApiResponse).toBe(true);
    });

    it('created response should be instance of ApiResponse', () => {
      const response = ApiResponse.created({ id: 1 });

      expect(response instanceof ApiResponse).toBe(true);
    });

    it('error response should be instance of ApiResponse', () => {
      const response = ApiResponse.error('error');

      expect(response instanceof ApiResponse).toBe(true);
    });
  });
});
