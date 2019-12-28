import { URL } from 'url';

import { ERequestMethod } from './erequest-method';
import { TResponseHeaders } from './tresponse-headers';

/**
 * Request interface.
 */
export interface IRequest<T> {
  /**
   * Set request body.
   * @param {object} body - entity body, will be JSON stringified.
   */
  setBody(body: object): void;

  /**
   * Set request method.
   * @param {ERequestMethod} method - request method, ie GET, POST etc.
   */
  setMethod(method: ERequestMethod): void;

  /**
   * Set a request header value.
   * @param {string} key - header name.
   * @param {string} value - header value.
   */
  setHeader(key: string, value: string): void;

  /**
   * Send request.
   * @param {URL} url - url to reach.
   * @return {Promise<T>} promise that resolves with request result, or throws if there's an error.
   */
  send(url: URL): Promise<T>;

  /**
   * Get response status code, only available once response has been received.
   * @return {number | undefined} response status code, if available.
   */
  getStatusCode(): number | undefined;

  /**
   * Get response headers, only available once response has been received.
   * @return {TResponseHeaders} response headers, if available.
   */
  getResponseHeaders(): TResponseHeaders | undefined;
}
