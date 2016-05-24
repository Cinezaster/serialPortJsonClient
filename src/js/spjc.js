'use strict';

(function () {
	// private variables
	var _host = '127.0.0.1';
	var _port = '8989';
	var _events = [];
	var _listeners = [
		"open",
		"close",
		"action",
		"serialList",
		"serialPortConnected",
		"position",
		"message",
		"update"
	];
	var _buffers = ['grbl', 'smoothie', 'tinyg'];
	var _baudrates = ['250000','230400','115200','57600','38400','19200','9600'];
 
	var _trigger = function (event, msg, clearAfterExecution) {
		var remove = false;
		var eventIndex;
		_events.forEach(function (listener, index, events) {
			if (listener.event === event) {
				var message = null;
				if (typeof msg === 'Event') {
					message = msg
				}
				listener.callback(message);
				eventIndex = index;
			}
		})

		if (clearAfterExecution) {
			_events = _events.splice(index,1)
		}
	}

	// main function
	window.Spjc = function (host) {
		this.host = host || _host;
		this.buffers = _buffers;
		this.baudrates = _baudrates;
		this.server;

		this.setUrl(host);

		this.connect();
	}

	Spjc.prototype.setUrl = function (host) {
		this.host = host || _host;
		this.connected = false;
		this.url = "ws://" + this.host + ":" + _port+ "/ws";
	}

	Spjc.prototype.connect = function (host) {
		if (host) {
			this.setUrl(host);
		}

		if (this.connection) {
			this.connection.close()
		}

		this.connection = new WebSocket(this.url);

		var that = this;

    	this.connection.onerror = function (e) {
    		console.error(e);
    		that.connected = false
    		_trigger('error', e);
    	}

    	this.connection.onopen = function () {
    		that.connected = true
    		_trigger('open');

    		that.getList();

    		that.getBufferAlgorithms();

    		that.getBaudrates();
    	}

    	this.connection.onmessage = function (e) {
    		that.onMessage(e.data);
    		_trigger('message', e.data);
    	}

    	this.connection.onclose = function (e) {
    		console.log(e);
    		_trigger('close', e);
    	}
	}

	Spjc.prototype.disconnect = function () {
		this.connection.close();
	}

	Spjc.prototype.restartSPJS = function () {
		this.connection.send('restart');
		var that = this;
		setTimeout(function () {
			that.connect()
		},10000);

	}

	Spjc.prototype.getList = function (callback) {
		if (this.connected) {
			this.connection.send('list');
			if (typeof callback === 'function') {
				_events.push({
					event:'waitingForGetList', 
					callback: callback,
					clearAfterExecution: true
				})
			}
		}
	}

	Spjc.prototype.getBufferAlgorithms = function () {
		if (this.connected) {
			this.connection.send('bufferalgorithms')
		}
	}

	Spjc.prototype.getBaudrates = function () {
		if (this.connected) {
			this.connection.send('baudrates')
		}
	}

	Spjc.prototype.getVersion = function () {
		if (this.connected) {
			this.connection.send('version')
		}
	}

	Spjc.prototype.getMemstats = function () {
		if (this.connected) {
			this.connection.send('memstats')
		}
	}

	Spjc.prototype.connectWithSerialPort = function (connectionObject) {
		if (this.connected && connectionObject.serialPort && connectionObject.baudrate && connectionObject.buffer) {
			// first close connection
			this.closeSerialPort(connectionObject.serialPort);
			this.connection.send('open '+ connectionObject.serialPort + ' ' + connectionObject.baudrate + ' ' + connectionObject.buffer);
		}
	}
	Spjc.prototype.closeSerialPort = function (serialPort) {
		if (this.connected && typeof serialPort === 'string') {
			console.log(serialPort);
			this.connection.send('close '+ serialPort);
			this.getList();
		} 
	}

	Spjc.prototype.on = function (event, callback) {
		if (_listeners.indexOf(event) >= 0) {
			var counter = 0;
			_events.forEach(function(eventObj) {
				if (eventObj.event === event && eventObj.callback.toString() === callback.toString()) {
					counter++;
				}
			})
			if (!counter) {
		    	_events.push({event,callback});
			}
		} else {
			// no event added.
		}
	}

	Spjc.prototype.onMessage = function (msg) {
		if (msg.match(/^\{/)) {
			var data = null;
			var error = null
			try {
				data = JSON.parse(msg);
			} catch (e) {
				console.error(e);
			}

			if (error) {
				return
			} 

			console.log(data)

			if ('Version' in data) {
				this.spjsVersion = data.Version;
				_trigger('update');
				return
			}

			if ('Commands' in data) {
				this.commands = data.Commands;
				_trigger('update');
				return
			}

			if ('Hostname' in data) {
				this.server = data.Hostname;
				_trigger('update');
				return
			}

			if ('SerialPorts' in data) {
				this.serialPorts = data.SerialPorts;
				_trigger('waitingForGetList');
				_trigger('update');
				return
			}

			if ('BufferAlgorithm' in data) {
				this.buffers = data.BufferAlgorithm;
				_trigger('update');
				return
			}

			if ('BaudRate' in data) {
				this.baudrates = data.BaudRate;
				_trigger('update');
				return
			}

			if ('Cmd' in data) {
				switch (data.Cmd) {
					case 'Complete':
						break;
					case 'Open':
						this.serialPortConnection = {
							connected : true,
							port: data.Port,
							baudrate : data.Baud,
							buffer: data.BufferType
						}
						this.getList();

						_trigger('serialPortConnected',this.serialPortConnection);
						break;
					case 'Queued':
						break;
					case 'Write':
						break;
					case 'OpenFail':
						break;
					case 'CompleteFake':
					case 'Complete':
						break;
					case 'Error':
						break;
					case 'FeedRateOverride':
						break;
				}
				return
			}

			if ('Error' in data) {
				this.error = data.Error;
			}

			if ('P' in data && 'D' in data) {

			}

		}
	}
})()