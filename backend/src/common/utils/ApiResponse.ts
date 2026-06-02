export class ApiResponse<T = any> {
  public success: boolean;
  public message: string;
  public data?: T;
  public meta?: Record<string, any>;

  constructor(success: boolean, message: string, data?: T, meta?: Record<string, any>) {
    this.success = success;
    this.message = message;
    this.data = data;
    this.meta = meta;
  }

  static ok<T>(data: T, message: string = 'Success', meta?: Record<string, any>): ApiResponse<T> {
    return new ApiResponse(true, message, data, meta);
  }

  static created<T>(data: T, message: string = 'Created successfully'): ApiResponse<T> {
    return new ApiResponse(true, message, data);
  }

  static error(message: string = 'Something went wrong'): ApiResponse {
    return new ApiResponse(false, message);
  }
}
