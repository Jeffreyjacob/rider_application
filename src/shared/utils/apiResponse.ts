import { Response } from "express";

interface ApiResponse<T> {
  success: boolean;
  data?: T | T[];
  message: string;
  error?: {
    code: string;
    stack?: string;
  };
  detail?: any;
  meta?: Record<string, any>;
}

export class ResponseHelper {
  static success<T>(
    res: Response,
    data: T | T[],
    statusCode: number,
    message: string,
    meta?: any
  ) {
    const response: ApiResponse<T> = {
      success: true,
      data,
      message,
      ...(meta && { meta }),
    };
    return res.status(statusCode).json(response);
  }

  static created<T>(res: Response, data: T | T[], message: string) {
    return this.success(res, data, 201, message);
  }

  static noContent(res: Response) {
    return res.status(204).send();
  }

  static error(
    res: Response,
    message: string,
    statusCode: number,
    code: string
  ) {
    const response: ApiResponse<null> = {
      success: false,
      message,
      error: {
        code,
      },
    };

    return res.status(statusCode).json(response);
  }
}
