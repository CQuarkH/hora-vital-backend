import { Response } from 'express';

export function createMockResponse(): Response {
  const res: Partial<Response> = {};

  res.status = jest.fn().mockImplementation(function (this: any, _code: number) {
    return this;
  });

  res.json = jest.fn().mockImplementation(function (this: any, _body: any) {
    return this;
  });

  res.send = jest.fn().mockImplementation(function (this: any, _body?: any) {
    return this;
  });

  return res as Response;
}
