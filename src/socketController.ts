import { Server } from 'http';
import express from 'express';
import SocketIO from 'socket.io';
import redis from 'socket.io-redis';

import { environment } from './config/env.config';
import { ApiService } from './apiService';
import { ConnectionHandler } from './connectionHandler';

/**
 * Extension of the Socket, which will store its own handler.
 */
interface SocketClient extends SocketIO.Socket {
  handler: ConnectionHandler;
}

/**
 * Controls the socket service
 */
export class SocketController {
  // The socket io server
  public readonly io: SocketIO.Server;
  // The entry point server
  public readonly expressServer: Server;
  // The API service to inject in the socket io client handlers
  private readonly apiService: ApiService;
  // The entry point app
  private readonly publicExpressApp: express.Application;

  constructor() {
    // Create the IO app and server
    this.apiService = new ApiService();
    this.publicExpressApp = express();
    this.expressServer = new Server(this.publicExpressApp);
    this.io = SocketIO(this.expressServer);

    // Set redis adapter if provided
    if (environment.redisUrl !== '') {
      this.io.adapter(redis(environment.redisUrl));
    }

    // For load balancing health check
    this.publicExpressApp.route('/').get((req: any, res: any) => {
      // Returns 200 OK to the client on request
      res.status(200).send('GPX Socket service v1.0');
    });
  }

  /**
   * Initiate the socket controller, starts the server and socket connection listener
   */
  initiate = () => {
    // Start the server on given port
    this.expressServer.listen(environment.ioPort, () => {
      console.log('Running Public API at', environment.ioPort);
    });
    // Add event handler for incoming clients
    this.io.sockets.on('connection', this.socketConnect);
    // Get live data every 10 seconds for connected users
    setInterval(this.produceLiveData, 10000);
  };

  /**
   * Handles a new socket client, creates a connection handler for the client that handles the client requests
   * @param client: The newly connected socket client
   */
  socketConnect = (client: SocketClient) => {
    // Create new connection handler for this connection
    client.handler = new ConnectionHandler(client, this.apiService);
    client.on('group:connect', client.handler.handleGroupConnect);
    client.on('group:disconnect', client.handler.handleGroupDisconnect);
  };

  /**
   * Called on interval, retrieves the latest group meter updates and sends them to the connected clients
   */
  produceLiveData = () => {
    const activeGroups = [];
    // Get all IO rooms for groupmeters. Those rooms are defined as `group/<id>`
    for (const room in this.io.sockets.adapter.rooms) {
      if (room.startsWith('group/')) {
        // Get the groupmeter id from the room name
        activeGroups.push(room.split('/')[1]);
      }
    }
    // Get the rooms from the api and send them to the clients
    if (activeGroups.length > 0) {
      this.apiService.getGroupLiveData(activeGroups).then(groups => {
        groups.forEach(group => {
          // Send the group data to the IO room, SocketIO will send the message to all the clients in the room
          this.io.in(`group/${group.pk}`).emit('group:update', group);
        });
      }).catch(error => {
        // exceptional error logging
        console.log('some error happening!', error);
      });
    }
  };
}
