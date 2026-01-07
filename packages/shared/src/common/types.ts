export enum ApiCode {
  SUCCESS = 200,        // 成功
  FAIL = 500,           // 服务器内部错误
  UNAUTHORIZED = 401,   // 未授权 (Token失效/错误)
  FORBIDDEN = 403,      // 无权限
  NOT_FOUND = 404,      // 资源不存在
}

export interface ApiResponse<T = any> {
  code: ApiCode;
  data?: T;
  msg?: string;
}

// 定义 Hello 接口的具体返回数据
export interface HelloData {
  message: string;
  timestamp: number;
}
