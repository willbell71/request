import * as http from 'http';
import * as https from 'https';
import { URL } from 'url';

import { IRequest } from './irequest';
import { ERequestMethod } from './erequest-method';
import { TResponseHeaders } from './tresponse-headers';
import { ILogger } from '@willbell71/logger';

/**
 * Request.
 */
export class Request<T> implements IRequest<T> {
  // logger
  private logger: ILogger;

  // request body, JSON stringified
  private requestBody?: string;
  // request method
  private requestMethod: ERequestMethod = ERequestMethod.GET;
  // request headers
  private requestHeaders: http.OutgoingHttpHeaders = {};

  // response
  private response: string = '';
  // response status code
  private responseStatusCode: number | undefined;
  // response headers
  private responseHeaders: TResponseHeaders | undefined;

  /**
   * Constructor.
   * @param {ILogger} logger - logger service provider.
   */
  public constructor(logger: ILogger) {
    this.logger = logger;
  }

  /**
   * Set request body.
   * @param {object} body - entity body, will be JSON stringified.
   */
  public setBody(body: object): void {
    // store body
    this.requestBody = JSON.stringify(body);
  }

  /**
   * Set request method.
   * @param {ERequestMethod} method - request method, ie GET, POST etc.
   */
  public setMethod(method: ERequestMethod): void {
    this.requestMethod = method;
  }

  /**
   * Set a request header value.
   * @param {string} key - header name.
   * @param {string} value - header value.
   */
  public setHeader(key: string, value: string): void {
    this.requestHeaders[key] = value;
  }

  /**
   * Send request.
   * @param {URL} url - url to reach.
   * @return {Promise<T>} promise that resolves with request result, or throws if there's an error.
   */
  public send(url: URL): Promise<T> {
    return new Promise<T>((resolve: (value: T) => void, reject: (err: Error) => void) => {
      if (this.requestBody) {
        this.setHeader('content-length', `${this.requestBody.length}`);
      }

      const options: http.RequestOptions = {
        hostname: url.hostname,
        port: parseInt(url.port) || ('https:' === url.protocol ? 443 : 80),
        path: `${url.pathname}${url.search}`,
        method: this.requestMethod,
        headers: this.requestHeaders
      };

      const callback: (res: http.IncomingMessage) => void = (res: http.IncomingMessage): void => {
        this.responseStatusCode = res.statusCode;
        this.responseHeaders = res.headers;

        res.on('data', (chunk: string) => this.response += chunk);
        res.on('end', () => {
          this.logger.debug('Request', `Request complete - ${this.requestMethod} ${url.href}`);

          try {
            resolve(JSON.parse(this.response));
          } catch {
            resolve(this.response as unknown as T);
          }
        });
      };

      this.logger.debug('Request', `Starting request - ${this.requestMethod} ${url.href}`);
      const req: http.ClientRequest = ('https:' === url.protocol) ? https.request(options, callback) : http.request(options, callback);

      req.on('error', (err: Error) => {
        this.logger.error(`Request - ${this.requestMethod} ${url.href} failed - ${err.message}`);
        reject(err);
      });

      if (this.requestBody) {
        this.logger.debug('Request', `Sending request body - ${this.requestMethod} ${url.href} - ${this.requestBody}`);
        req.write(this.requestBody);
      }

      req.end();
    });
  }

  /**
   * Get response status code, only available once response has been received.
   * @return {number | undefined} response status code, if available.
   */
  public getStatusCode(): number | undefined {
    return this.responseStatusCode;
  }

  /**
   * Get response headers, only available once response has been received.
   * @return {TResponseHeaders} response headers, if available.
   */
  public getResponseHeaders(): TResponseHeaders | undefined {
    return this.responseHeaders;
  }
}
