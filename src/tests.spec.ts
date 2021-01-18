import * as chai from 'chai';
import chaiHttp from 'chai-http';
import io from 'socket.io-client';
import axios from 'axios';
import { after } from 'mocha';
import MockAdapter from 'axios-mock-adapter';

import { environment } from './config/env.config';
import { SocketController } from './socketController';
import { SocketResponse } from './connectionHandler';
import { IGroupMeter } from './groupMeter';

chai.use(chaiHttp);
const expect = chai.expect;

describe('Socket server', () => {
  const clientToken = 'some-valid-auth-token';
  const socketController: SocketController = new SocketController();
  const mock = new MockAdapter(axios);
  // Main client
  const client: SocketIOClient.Socket = io.connect('http://localhost:3000', {autoConnect: false});

  before((done) => {
    socketController.initiate();

    // Axios mock endpoint for public groupmeters
    mock.onGet(`${environment.apiUrl}/api/meters/groups/public/groupmeter1/`).reply((config) => {
      return [200, {pk: 1, name: 'Some groupmeter!'}];
    });

    // Axios mock endpoint for private groupmeters
    mock.onGet(`${environment.apiUrl}/api/meters/groups/2/`).reply((config) => {
      if (config.headers['Authorization'] === `Token ${clientToken}`) {
        return [200, {pk: 2, name: 'Private groupmeter!'}];
      } else {
        return [403];
      }
    });

    // Axios mock endpoint for live data
    mock.onGet(`${environment.apiUrl}/api/meters/groups/live-data/`).reply((config) => {
      if (config.params['token'] === environment.apiKey) {
        return [200, [{
          pk: 1,
          r: [{  // all recent participant updates
            pk: 1,  // participant pk
            ti: 123.321,  // total_import
            te: 321.123,  // total_export
            tg: 111.222,  // total_gas
            p: 12.321,  // actual_power
            g: 21.123,  // actual_gas
            s: 1.234,  // actual_solar
          }],
          ti: 123.999,  // total_import
          te: 321.999,  // total_export
          tg: 111.999,  // total_gas
          p: 12.999,  // actual_power
          g: 21.999,  // actual_gas
          s: 1.999,  // actual_solar
        }]];
      } else {
        return [403];
      }
    });

    done();
  });

  beforeEach((done) => {
    client.connect();
    done();
  });

  afterEach((done) => {
    client.disconnect();
    done();
  });

  after(() => {
    process.exit();
  });


  describe('socket', () => {

    describe('group:connect', () => {

      it('should connect to a public group meter', (done) => {
        client.emit('group:connect', {
          authorization: null,
          group: 'groupmeter1',
          public: true,
        }, (response: SocketResponse<string>) => {
          expect(response.ok).to.be.equal(true);
          expect(response.data).to.be.equal('Connected to Some groupmeter!');
          const rooms = socketController.io.sockets.adapter.rooms;
          // There should now be a group room
          expect(rooms).to.contain.keys(['group/1']);
          done();
        });
      });

      it('should not connect to a public group meter, not found', (done) => {
        client.emit('group:connect', {
          authorization: null,
          group: 'invalidname',
          public: true,
        }, (response: SocketResponse<string>) => {
          expect(response.ok).to.be.equal(false);
          expect(response.error).to.be.equal('Group not found');
          const rooms = socketController.io.sockets.adapter.rooms;
          // There should be no group rooms
          expect(rooms).to.not.contain.keys(['group']);
          done();
        });
      });

      it('should connect to a private group meter', (done) => {
        client.emit('group:connect', {
          authorization: clientToken,
          group: 2,
          public: false,
        }, (response: SocketResponse<string>) => {
          expect(response.ok).to.be.equal(true);
          expect(response.data).to.be.equal('Connected to Private groupmeter!');
          const rooms = socketController.io.sockets.adapter.rooms;
          // There should now be a group room
          expect(rooms).to.contain.keys(['group/2']);
          done();
        });
      });

      it('should not connect to a public group meter, not found', (done) => {
        client.emit('group:connect', {
          authorization: clientToken,
          group: 999,
          public: false,
        }, (response: SocketResponse<string>) => {
          expect(response.ok).to.be.equal(false);
          expect(response.error).to.be.equal('Group not found');
          const rooms = socketController.io.sockets.adapter.rooms;
          // There should be no group rooms
          expect(rooms).to.not.contain.keys(['group']);
          done();
        });
      });

      it('should not connect to a public group meter, forbidden', (done) => {
        client.emit('group:connect', {
          authorization: 'invalidtoken',
          group: 2,
          public: false,
        }, (response: SocketResponse<string>) => {
          expect(response.ok).to.be.equal(false);
          expect(response.error).to.be.equal('Forbidden');
          const rooms = socketController.io.sockets.adapter.rooms;
          // There should be no group rooms
          expect(rooms).to.not.contain.keys(['group']);
          done();
        });
      });

      it('should not connect to a public group meter, no token', (done) => {
        client.emit('group:connect', {
          authorization: null,
          group: 2,
          public: false,
        }, (response: SocketResponse<string>) => {
          expect(response.ok).to.be.equal(false);
          expect(response.error).to.be.equal('No authorization token provided');
          const rooms = socketController.io.sockets.adapter.rooms;
          // There should be no group rooms
          expect(rooms).to.not.contain.keys(['group']);
          done();
        });
      });

      it('should not connect to a group meter, no group provided', (done) => {
        client.emit('group:connect', {
          authorization: null,
          group: null,
          public: false,
        }, (response: SocketResponse<string>) => {
          expect(response.ok).to.be.equal(false);
          expect(response.error).to.be.equal('No group identification provided');
          const rooms = socketController.io.sockets.adapter.rooms;
          // There should be no group rooms
          expect(rooms).to.not.contain.keys(['group']);
          done();
        });
      });

    });

    describe('group:disconnect', () => {

      it('should disconnect the client from the public group after being connected', (done) => {

        client.emit('group:connect', {authorization: null, group: 'groupmeter1', public: true}, () => {
          const roomsBefore = socketController.io.sockets.adapter.rooms;
          // There should now be a group room
          expect(roomsBefore).to.contain.keys(['group/1']);
          client.emit('group:disconnect', {group: 1}, (response: SocketResponse) => {
            expect(response.ok).to.be.equal(true);
            // takes some time for the io adapter to update
            setTimeout(() => {
              const rooms = socketController.io.sockets.adapter.rooms;
              // No group rooms should be available after disconnect
              expect(rooms).to.not.contain.keys(['group/1']);
              done();
            }, 100);
          });
        });
      });

      it('should disconnect the client from the private group after being connected', (done) => {

        client.emit('group:connect', {authorization: clientToken, group: 2, public: false}, () => {
          const roomsBefore = socketController.io.sockets.adapter.rooms;
          // There should now be a group room
          expect(roomsBefore).to.contain.keys(['group/2']);
          client.emit('group:disconnect', {group: 2}, (response: SocketResponse) => {
            expect(response.ok).to.be.equal(true);
            // takes some time for the io adapter to update
            setTimeout(() => {
              const rooms = socketController.io.sockets.adapter.rooms;
              // No group rooms should be available after disconnect
              expect(rooms).to.not.contain.keys(['group/2']);
              done();
            }, 100);
          });
        });
      });

      it('should disconnect the client from the group', (done) => {

        client.emit('group:disconnect', {group: 1}, (response: SocketResponse) => {
          expect(response.ok).to.be.equal(true);
          const rooms = socketController.io.sockets.adapter.rooms;
          // No group rooms should be available
          expect(rooms).to.not.contain.keys(['group']);
          done();
        });
      });

    });

  });

  describe('interval', () => {

    beforeEach((done) => {
      client.emit('group:connect', {authorization: null, group: 'groupmeter1', public: true}, (response: any) => {
        done();
      });
    });

    it('Should retrieve live data and send to the client', (done) => {
      client.on('group:update', (data: IGroupMeter) => {
        expect(data.pk).to.be.equal(1);
        // TODO: rest of the assertions, same data as in mock

        done();
      });

      socketController.produceLiveData();
    });
  });


});
