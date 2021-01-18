import * as SocketIO from 'socket.io';

import { ApiService } from './apiService';
import { IGroupMeter } from './groupMeter';
import { AxiosError } from 'axios';


/**
 * Interface for client connecting to live group meter updates
 */
interface IGroupConnectData {
  authorization: string;
  group: any;
  public: boolean;
}

/**
 * Interface for client disconnecting from live updates
 */
interface IGroupDisconnectData {
  group: number;
}

/**
 * Connection handler manages a single client connection
 */
export class ConnectionHandler {
  /**
   * Create a new
   * @param client
   * @param apiService
   */
  constructor(private client: SocketIO.Socket, private apiService: ApiService) {
  }

  /**
   * Handles a request to subscribe to a group meter.this endpoint is for both private and public group meters.
   * @param connectData: contains the requested group identifier, public yes/no and the optional authorization token
   * @param cb: response
   */
  handleGroupConnect = (connectData: IGroupConnectData, cb: Function) => {
    if (!connectData.group) {
      // Requires a group id
      return cb(SocketResponse.Error('No group identification provided'));
    }

    // Handle the API response
    const handleResponse = (group: IGroupMeter) => {
      // Room exists and is available to the client, join the IO room for live updates
      this.client.join(`group/${group.pk}`);
      cb(SocketResponse.Success(`Connected to ${group.name}`));
    };

    // Handle the API response errors
    const handleError = (error: AxiosError) => {
      // Room does not exists or is not available to the client
      switch (error.response.status) {
        case 403:
          return cb(SocketResponse.Error('Forbidden'));
        case 404:
          return cb(SocketResponse.Error('Group not found'));
        default:  // TODO: add more error handling, 403 and 404 will be most common
          return cb(SocketResponse.Error('Unknown error'));
      }
    };

    if (connectData.public) {
      // Get public meter
      this.apiService.getPublicGroupMeter(connectData.group).then(handleResponse).catch(handleError);
    } else {
      // Get personal group meter
      if (!connectData.authorization) {
        // Requires an authorization token
        return cb(SocketResponse.Error('No authorization token provided'));
      }
      this.apiService.getPrivateGroupMeter(connectData.group, connectData.authorization).then(handleResponse).catch(handleError);
    }
  };

  /**
   * Disconnect from group meter live updates
   * @param data: contains group id to disconnect from
   * @param cb
   */
  handleGroupDisconnect = (data: IGroupDisconnectData, cb?: Function) => {
    // Leave the IO room based on group id. Will always succeed
    this.client.leave(`group/${data.group}`, (...args: any[]) => {
      if (cb) {
        cb(SocketResponse.Success(`Disconnected from ${data.group}`));
      }
    });
  };

}

/**
 * Simple class for socket response
 */
export class SocketResponse<T = any> {
  ok: boolean;
  error: string;
  data: T;

  constructor(data: T, error?: string) {
    this.ok = error == null;
    if (this.ok) {
      this.data = data;
    } else {
      this.error = error;
    }
  }

  /**
   * Easy method to create a success response
   * @param data: data object
   * @constructor
   */
  static Success<T>(data: T): SocketResponse<T> {
    return new SocketResponse<T>(data);
  }


  /**
   * Easy method to create an error response
   * @param error: error message
   * @constructor
   */
  static Error(error: string): SocketResponse {
    return new SocketResponse(null, error);
  }
}
