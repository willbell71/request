import * as http from 'http';
import * as https from 'https';
import { URL } from 'url';
import { EventEmitter } from 'events';

import { ILogLine, ILogger, Logger } from '@willbell71/logger';

import { Request } from './request';
import { IRequest } from './irequest';
import { ERequestMethod } from './erequest-method';

const mockEnd: jest.Mock = jest.fn();
const mockWrite: jest.Mock = jest.fn();
class MockClientRequest extends EventEmitter {
  public end(): void { mockEnd(); }
  public write(data: string): void { mockWrite(data); }
}

class MockResponse extends EventEmitter {
  public statusCode: number | undefined = 200;
  public headers: {[key: string]: string | string[] | undefined} = {'Content-Type': 'application/json'};
}

let mockHttpClientRequest: MockClientRequest;
let mockHttpCallback: ((res: http.IncomingMessage) => void) | undefined;
let mockHttpOptions: http.RequestOptions;
jest.spyOn(http, 'request').mockImplementation((url: string | URL,
  options: http.RequestOptions/*,
  callback?: (res: http.IncomingMessage) => void*/): http.ClientRequest => {

  // remap params, as mock seems to think callback has different interface to one used :/
  mockHttpCallback = options as unknown as (res: http.IncomingMessage) => void;
  mockHttpOptions = url as unknown as http.RequestOptions;

  mockHttpClientRequest = new MockClientRequest();
  return mockHttpClientRequest as unknown as http.ClientRequest;
});

let mockHttpsClientRequest: MockClientRequest;
jest.spyOn(https, 'request').mockImplementation((): http.ClientRequest => {
  mockHttpsClientRequest = new MockClientRequest();
  return mockHttpsClientRequest as unknown as http.ClientRequest;
});

let logLineSpy: jest.Mock;
let warnLineSpy: jest.Mock;
let errorLineSpy: jest.Mock;
let assertLineSpy: jest.Mock;
let log: ILogLine;
let warn: ILogLine;
let error: ILogLine;
let assert: ILogLine;
let logger: ILogger;
let request: IRequest<string>;
beforeEach(() => {
  logLineSpy = jest.fn();
  warnLineSpy = jest.fn();
  errorLineSpy = jest.fn();
  assertLineSpy = jest.fn();

  log = {log: logLineSpy};
  warn = {log: warnLineSpy};
  error = {log: errorLineSpy};
  assert = {log: assertLineSpy};
  logger = new Logger(log, warn, error, assert);

  request = new Request<string>(logger);
});
afterEach(() => jest.clearAllMocks());

describe('request', () => {
  it('should instantiate', () => {
    expect(request).toBeTruthy();
  });

  describe('send', () => {
    it('should call http.request with params', () => {
      request.send(new URL('http://www.aaa.com:44/?testA=test1&testB=true'));

      expect(http.request).toHaveBeenCalledTimes(1);
      expect(http.request).toHaveBeenCalledWith({
        hostname: 'www.aaa.com',
        port: 44,
        path: '/?testA=test1&testB=true',
        method: 'GET',
        headers: {}
      }, expect.any(Function));
    });

    it('should call http.request with default port 80 for http', () => {
      request.send(new URL('http://www.aaa.com/?testA=test1&testB=true'));

      expect(http.request).toHaveBeenCalledTimes(1);
      expect(http.request).toHaveBeenCalledWith({
        hostname: 'www.aaa.com',
        port: 80,
        path: '/?testA=test1&testB=true',
        method: 'GET',
        headers: {}
      }, expect.any(Function));
    });

    it('should call https.request with params', () => {
      request.send(new URL('https://www.bbb.com:44/?test1=test&test2=true'));

      expect(https.request).toHaveBeenCalledTimes(1);
      expect(https.request).toHaveBeenCalledWith({
        hostname: 'www.bbb.com',
        port: 44,
        path: '/?test1=test&test2=true',
        method: 'GET',
        headers: {}
      }, expect.any(Function));
    });

    it('should call https.request with default port 443 for https', () => {
      request.send(new URL('https://www.bbb.com/?test1=test&test2=true'));

      expect(https.request).toHaveBeenCalledTimes(1);
      expect(https.request).toHaveBeenCalledWith({
        hostname: 'www.bbb.com',
        port: 443,
        path: '/?test1=test&test2=true',
        method: 'GET',
        headers: {}
      }, expect.any(Function));
    });

    it('should call http.request', () => {
      request.send(new URL('http://host'));

      expect(http.request).toHaveBeenCalledTimes(1);
    });

    it('should call https.request', () => {
      request.send(new URL('https://host'));

      expect(https.request).toHaveBeenCalledTimes(1);
    });

    it('should default params to port 80 and path /', () => {
      request.send(new URL('http://host'));

      expect(http.request).toHaveBeenCalledWith({
        hostname: 'host',
        port: 80,
        path: '/',
        method: 'GET',
        headers: {}
      }, expect.any(Function));
    });

    it('should pass params to http.request', () => {
      request.send(new URL('http://host:80/path'));

      expect(http.request).toHaveBeenCalledWith({
        hostname: 'host',
        port: 80,
        path: '/path',
        method: 'GET',
        headers: {}
      }, expect.any(Function));
    });

    it('should pass params to https.request', () => {
      request.send(new URL('https://host/path'));

      expect(https.request).toHaveBeenCalledWith({
        hostname: 'host',
        port: 443,
        path: '/path',
        method: 'GET',
        headers: {}
      }, expect.any(Function));
    });

    it('should resolve on end with JSON response', (done: jest.DoneCallback) => {
      request.send(new URL('http://host:80/path'))
        .then((data: string) => {
          expect(data).toEqual({data: 'one'});
          done();    
        })
        .catch(() => done('Invoked catch block'));

      if (mockHttpCallback) {
        const res: MockResponse = new MockResponse();
        mockHttpCallback(res as unknown as http.IncomingMessage);
        res.emit('data', '{"data": ');
        res.emit('data', '"one"}');
        res.emit('end');
      } else {
        done('Failed to catch mock callback');
      }
    });

    it('should resolve on end with string response', (done: jest.DoneCallback) => {
      request.send(new URL('http://host:80/path'))
        .then((data: string) => {
          expect(data).toEqual('Hello World');
          done();    
        })
        .catch(() => done('Invoked catch block'));

      if (mockHttpCallback) {
        const res: MockResponse = new MockResponse();
        mockHttpCallback(res as unknown as http.IncomingMessage);
        res.emit('data', 'Hello World');
        res.emit('end');
      } else {
        done('Failed to catch mock callback');
      }
    });

    it('should handle error', (done: jest.DoneCallback) => {
      request.send(new URL('http://host:80/path'))
        .then(() => done('Called then on error'))
        .catch(() => done());

      mockHttpClientRequest.emit('error', new Error('Failed'));
    });

    it('should use GET by default', (done: jest.DoneCallback) => {
      request.send(new URL('http://host:80/path'))
        .then(() => {
          expect(mockHttpOptions.method).toEqual('GET');
          done();
        })
        .catch(() => done('Failed'));

      if (mockHttpCallback) {
        const res: MockResponse = new MockResponse();
        mockHttpCallback(res as unknown as http.IncomingMessage);
        res.emit('data', '{"data": ');
        res.emit('data', '"one"}');
        res.emit('end');
      } else {
        done('Failed to catch mock callback');
      }
    });
  });

  describe('setBody', () => {
    it('should write body', (done: jest.DoneCallback) => {
      request.setBody({test: 'test'});
      request.send(new URL('http://host:80/path'))
        .then(() => {
          expect(mockWrite).toHaveBeenCalledTimes(1);
          expect(mockWrite).toHaveBeenCalledWith('{"test":"test"}');
          done();
        })
        .catch(() => done('Failed'));

      if (mockHttpCallback) {
        const res: MockResponse = new MockResponse();
        mockHttpCallback(res as unknown as http.IncomingMessage);
        res.emit('data', '{"data": ');
        res.emit('data', '"one"}');
        res.emit('end');
      } else {
        done('Failed to catch mock callback');
      }
    });
  });

  describe('setMethod', () => {
    it('should use method set', (done: jest.DoneCallback) => {
      request.setMethod(ERequestMethod.DELETE);
      request.send(new URL('http://host:80/path'))
        .then(() => {
          expect(mockHttpOptions.method).toEqual(ERequestMethod.DELETE);
          done();
        })
        .catch(() => done('Failed'));

      if (mockHttpCallback) {
        const res: MockResponse = new MockResponse();
        mockHttpCallback(res as unknown as http.IncomingMessage);
        res.emit('data', '{"data": ');
        res.emit('data', '"one"}');
        res.emit('end');
      } else {
        done('Failed to catch mock callback');
      }
    });
  });

  describe('setHeader', () => {
    it('should pass any headers set', (done: jest.DoneCallback) => {
      request.setHeader('one', '1');
      request.setHeader('two', '2');
      request.send(new URL('http://host:80/path'))
        .then(() => {
          expect(mockHttpOptions.headers).toEqual({one: '1', two: '2'});
          done();
        })
        .catch(() => done('Failed'));

      if (mockHttpCallback) {
        const res: MockResponse = new MockResponse();
        mockHttpCallback(res as unknown as http.IncomingMessage);
        res.emit('data', '{"data": ');
        res.emit('data', '"one"}');
        res.emit('end');
      } else {
        done('Failed to catch mock callback');
      }
    });
  });

  describe('getStatusCode', () => {
    it('should return status code', (done: jest.DoneCallback) => {
      request.send(new URL('http://host:80/path'))
        .then(() => {
          expect(request.getStatusCode()).toEqual(200);
          done();
        })
        .catch(() => done('Failed'));

      if (mockHttpCallback) {
        const res: MockResponse = new MockResponse();
        mockHttpCallback(res as unknown as http.IncomingMessage);
        res.emit('data', '{"data": ');
        res.emit('data', '"one"}');
        res.emit('end');
      } else {
        done('Failed to catch mock callback');
      }
    });
  });

  describe('getResponseHeaders', () => {
    it('should return response headers', (done: jest.DoneCallback) => {
      request.send(new URL('http://host:80/path'))
        .then(() => {
          expect(request.getResponseHeaders()).toEqual({'Content-Type': 'application/json'});
          done();
        })
        .catch(() => done('Failed'));

      if (mockHttpCallback) {
        const res: MockResponse = new MockResponse();
        mockHttpCallback(res as unknown as http.IncomingMessage);
        res.emit('data', '{"data": ');
        res.emit('data', '"one"}');
        res.emit('end');
      } else {
        done('Failed to catch mock callback');
      }
    });
  });
});
