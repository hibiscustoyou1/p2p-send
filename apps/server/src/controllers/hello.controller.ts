import { Request, Response } from 'express';
import { ApiResponse, HelloData, ApiCode } from '@repo/shared';

export const getHello = async (_req: Request, res: Response<ApiResponse<HelloData>>) => {
  try {
    res.json({
      code: ApiCode.SUCCESS,
      data: {
        message: "Hello, World from Monorepo!",
        timestamp: Date.now()
      }
    });
  } catch (error) {
    res.status(500).json({
      code: ApiCode.FAIL,
      msg: '服务器错误'
    });
  }
};
