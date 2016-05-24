(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
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
},{}]},{},[1])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy93YXRjaGlmeS9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3Nlci1wYWNrL19wcmVsdWRlLmpzIiwic3JjL2pzL3NwamMuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIid1c2Ugc3RyaWN0JztcblxuKGZ1bmN0aW9uICgpIHtcblx0Ly8gcHJpdmF0ZSB2YXJpYWJsZXNcblx0dmFyIF9ob3N0ID0gJzEyNy4wLjAuMSc7XG5cdHZhciBfcG9ydCA9ICc4OTg5Jztcblx0dmFyIF9ldmVudHMgPSBbXTtcblx0dmFyIF9saXN0ZW5lcnMgPSBbXG5cdFx0XCJvcGVuXCIsXG5cdFx0XCJjbG9zZVwiLFxuXHRcdFwiYWN0aW9uXCIsXG5cdFx0XCJzZXJpYWxMaXN0XCIsXG5cdFx0XCJzZXJpYWxQb3J0Q29ubmVjdGVkXCIsXG5cdFx0XCJwb3NpdGlvblwiLFxuXHRcdFwibWVzc2FnZVwiLFxuXHRcdFwidXBkYXRlXCJcblx0XTtcblx0dmFyIF9idWZmZXJzID0gWydncmJsJywgJ3Ntb290aGllJywgJ3RpbnlnJ107XG5cdHZhciBfYmF1ZHJhdGVzID0gWycyNTAwMDAnLCcyMzA0MDAnLCcxMTUyMDAnLCc1NzYwMCcsJzM4NDAwJywnMTkyMDAnLCc5NjAwJ107XG4gXG5cdHZhciBfdHJpZ2dlciA9IGZ1bmN0aW9uIChldmVudCwgbXNnLCBjbGVhckFmdGVyRXhlY3V0aW9uKSB7XG5cdFx0dmFyIHJlbW92ZSA9IGZhbHNlO1xuXHRcdHZhciBldmVudEluZGV4O1xuXHRcdF9ldmVudHMuZm9yRWFjaChmdW5jdGlvbiAobGlzdGVuZXIsIGluZGV4LCBldmVudHMpIHtcblx0XHRcdGlmIChsaXN0ZW5lci5ldmVudCA9PT0gZXZlbnQpIHtcblx0XHRcdFx0dmFyIG1lc3NhZ2UgPSBudWxsO1xuXHRcdFx0XHRpZiAodHlwZW9mIG1zZyA9PT0gJ0V2ZW50Jykge1xuXHRcdFx0XHRcdG1lc3NhZ2UgPSBtc2dcblx0XHRcdFx0fVxuXHRcdFx0XHRsaXN0ZW5lci5jYWxsYmFjayhtZXNzYWdlKTtcblx0XHRcdFx0ZXZlbnRJbmRleCA9IGluZGV4O1xuXHRcdFx0fVxuXHRcdH0pXG5cblx0XHRpZiAoY2xlYXJBZnRlckV4ZWN1dGlvbikge1xuXHRcdFx0X2V2ZW50cyA9IF9ldmVudHMuc3BsaWNlKGluZGV4LDEpXG5cdFx0fVxuXHR9XG5cblx0Ly8gbWFpbiBmdW5jdGlvblxuXHR3aW5kb3cuU3BqYyA9IGZ1bmN0aW9uIChob3N0KSB7XG5cdFx0dGhpcy5ob3N0ID0gaG9zdCB8fCBfaG9zdDtcblx0XHR0aGlzLmJ1ZmZlcnMgPSBfYnVmZmVycztcblx0XHR0aGlzLmJhdWRyYXRlcyA9IF9iYXVkcmF0ZXM7XG5cdFx0dGhpcy5zZXJ2ZXI7XG5cblx0XHR0aGlzLnNldFVybChob3N0KTtcblxuXHRcdHRoaXMuY29ubmVjdCgpO1xuXHR9XG5cblx0U3BqYy5wcm90b3R5cGUuc2V0VXJsID0gZnVuY3Rpb24gKGhvc3QpIHtcblx0XHR0aGlzLmhvc3QgPSBob3N0IHx8IF9ob3N0O1xuXHRcdHRoaXMuY29ubmVjdGVkID0gZmFsc2U7XG5cdFx0dGhpcy51cmwgPSBcIndzOi8vXCIgKyB0aGlzLmhvc3QgKyBcIjpcIiArIF9wb3J0KyBcIi93c1wiO1xuXHR9XG5cblx0U3BqYy5wcm90b3R5cGUuY29ubmVjdCA9IGZ1bmN0aW9uIChob3N0KSB7XG5cdFx0aWYgKGhvc3QpIHtcblx0XHRcdHRoaXMuc2V0VXJsKGhvc3QpO1xuXHRcdH1cblxuXHRcdGlmICh0aGlzLmNvbm5lY3Rpb24pIHtcblx0XHRcdHRoaXMuY29ubmVjdGlvbi5jbG9zZSgpXG5cdFx0fVxuXG5cdFx0dGhpcy5jb25uZWN0aW9uID0gbmV3IFdlYlNvY2tldCh0aGlzLnVybCk7XG5cblx0XHR2YXIgdGhhdCA9IHRoaXM7XG5cbiAgICBcdHRoaXMuY29ubmVjdGlvbi5vbmVycm9yID0gZnVuY3Rpb24gKGUpIHtcbiAgICBcdFx0Y29uc29sZS5lcnJvcihlKTtcbiAgICBcdFx0dGhhdC5jb25uZWN0ZWQgPSBmYWxzZVxuICAgIFx0XHRfdHJpZ2dlcignZXJyb3InLCBlKTtcbiAgICBcdH1cblxuICAgIFx0dGhpcy5jb25uZWN0aW9uLm9ub3BlbiA9IGZ1bmN0aW9uICgpIHtcbiAgICBcdFx0dGhhdC5jb25uZWN0ZWQgPSB0cnVlXG4gICAgXHRcdF90cmlnZ2VyKCdvcGVuJyk7XG5cbiAgICBcdFx0dGhhdC5nZXRMaXN0KCk7XG5cbiAgICBcdFx0dGhhdC5nZXRCdWZmZXJBbGdvcml0aG1zKCk7XG5cbiAgICBcdFx0dGhhdC5nZXRCYXVkcmF0ZXMoKTtcbiAgICBcdH1cblxuICAgIFx0dGhpcy5jb25uZWN0aW9uLm9ubWVzc2FnZSA9IGZ1bmN0aW9uIChlKSB7XG4gICAgXHRcdHRoYXQub25NZXNzYWdlKGUuZGF0YSk7XG4gICAgXHRcdF90cmlnZ2VyKCdtZXNzYWdlJywgZS5kYXRhKTtcbiAgICBcdH1cblxuICAgIFx0dGhpcy5jb25uZWN0aW9uLm9uY2xvc2UgPSBmdW5jdGlvbiAoZSkge1xuICAgIFx0XHRjb25zb2xlLmxvZyhlKTtcbiAgICBcdFx0X3RyaWdnZXIoJ2Nsb3NlJywgZSk7XG4gICAgXHR9XG5cdH1cblxuXHRTcGpjLnByb3RvdHlwZS5kaXNjb25uZWN0ID0gZnVuY3Rpb24gKCkge1xuXHRcdHRoaXMuY29ubmVjdGlvbi5jbG9zZSgpO1xuXHR9XG5cblx0U3BqYy5wcm90b3R5cGUucmVzdGFydFNQSlMgPSBmdW5jdGlvbiAoKSB7XG5cdFx0dGhpcy5jb25uZWN0aW9uLnNlbmQoJ3Jlc3RhcnQnKTtcblx0XHR2YXIgdGhhdCA9IHRoaXM7XG5cdFx0c2V0VGltZW91dChmdW5jdGlvbiAoKSB7XG5cdFx0XHR0aGF0LmNvbm5lY3QoKVxuXHRcdH0sMTAwMDApO1xuXG5cdH1cblxuXHRTcGpjLnByb3RvdHlwZS5nZXRMaXN0ID0gZnVuY3Rpb24gKGNhbGxiYWNrKSB7XG5cdFx0aWYgKHRoaXMuY29ubmVjdGVkKSB7XG5cdFx0XHR0aGlzLmNvbm5lY3Rpb24uc2VuZCgnbGlzdCcpO1xuXHRcdFx0aWYgKHR5cGVvZiBjYWxsYmFjayA9PT0gJ2Z1bmN0aW9uJykge1xuXHRcdFx0XHRfZXZlbnRzLnB1c2goe1xuXHRcdFx0XHRcdGV2ZW50Oid3YWl0aW5nRm9yR2V0TGlzdCcsIFxuXHRcdFx0XHRcdGNhbGxiYWNrOiBjYWxsYmFjayxcblx0XHRcdFx0XHRjbGVhckFmdGVyRXhlY3V0aW9uOiB0cnVlXG5cdFx0XHRcdH0pXG5cdFx0XHR9XG5cdFx0fVxuXHR9XG5cblx0U3BqYy5wcm90b3R5cGUuZ2V0QnVmZmVyQWxnb3JpdGhtcyA9IGZ1bmN0aW9uICgpIHtcblx0XHRpZiAodGhpcy5jb25uZWN0ZWQpIHtcblx0XHRcdHRoaXMuY29ubmVjdGlvbi5zZW5kKCdidWZmZXJhbGdvcml0aG1zJylcblx0XHR9XG5cdH1cblxuXHRTcGpjLnByb3RvdHlwZS5nZXRCYXVkcmF0ZXMgPSBmdW5jdGlvbiAoKSB7XG5cdFx0aWYgKHRoaXMuY29ubmVjdGVkKSB7XG5cdFx0XHR0aGlzLmNvbm5lY3Rpb24uc2VuZCgnYmF1ZHJhdGVzJylcblx0XHR9XG5cdH1cblxuXHRTcGpjLnByb3RvdHlwZS5nZXRWZXJzaW9uID0gZnVuY3Rpb24gKCkge1xuXHRcdGlmICh0aGlzLmNvbm5lY3RlZCkge1xuXHRcdFx0dGhpcy5jb25uZWN0aW9uLnNlbmQoJ3ZlcnNpb24nKVxuXHRcdH1cblx0fVxuXG5cdFNwamMucHJvdG90eXBlLmdldE1lbXN0YXRzID0gZnVuY3Rpb24gKCkge1xuXHRcdGlmICh0aGlzLmNvbm5lY3RlZCkge1xuXHRcdFx0dGhpcy5jb25uZWN0aW9uLnNlbmQoJ21lbXN0YXRzJylcblx0XHR9XG5cdH1cblxuXHRTcGpjLnByb3RvdHlwZS5jb25uZWN0V2l0aFNlcmlhbFBvcnQgPSBmdW5jdGlvbiAoY29ubmVjdGlvbk9iamVjdCkge1xuXHRcdGlmICh0aGlzLmNvbm5lY3RlZCAmJiBjb25uZWN0aW9uT2JqZWN0LnNlcmlhbFBvcnQgJiYgY29ubmVjdGlvbk9iamVjdC5iYXVkcmF0ZSAmJiBjb25uZWN0aW9uT2JqZWN0LmJ1ZmZlcikge1xuXHRcdFx0Ly8gZmlyc3QgY2xvc2UgY29ubmVjdGlvblxuXHRcdFx0dGhpcy5jbG9zZVNlcmlhbFBvcnQoY29ubmVjdGlvbk9iamVjdC5zZXJpYWxQb3J0KTtcblx0XHRcdHRoaXMuY29ubmVjdGlvbi5zZW5kKCdvcGVuICcrIGNvbm5lY3Rpb25PYmplY3Quc2VyaWFsUG9ydCArICcgJyArIGNvbm5lY3Rpb25PYmplY3QuYmF1ZHJhdGUgKyAnICcgKyBjb25uZWN0aW9uT2JqZWN0LmJ1ZmZlcik7XG5cdFx0fVxuXHR9XG5cdFNwamMucHJvdG90eXBlLmNsb3NlU2VyaWFsUG9ydCA9IGZ1bmN0aW9uIChzZXJpYWxQb3J0KSB7XG5cdFx0aWYgKHRoaXMuY29ubmVjdGVkICYmIHR5cGVvZiBzZXJpYWxQb3J0ID09PSAnc3RyaW5nJykge1xuXHRcdFx0Y29uc29sZS5sb2coc2VyaWFsUG9ydCk7XG5cdFx0XHR0aGlzLmNvbm5lY3Rpb24uc2VuZCgnY2xvc2UgJysgc2VyaWFsUG9ydCk7XG5cdFx0XHR0aGlzLmdldExpc3QoKTtcblx0XHR9IFxuXHR9XG5cblx0U3BqYy5wcm90b3R5cGUub24gPSBmdW5jdGlvbiAoZXZlbnQsIGNhbGxiYWNrKSB7XG5cdFx0aWYgKF9saXN0ZW5lcnMuaW5kZXhPZihldmVudCkgPj0gMCkge1xuXHRcdFx0dmFyIGNvdW50ZXIgPSAwO1xuXHRcdFx0X2V2ZW50cy5mb3JFYWNoKGZ1bmN0aW9uKGV2ZW50T2JqKSB7XG5cdFx0XHRcdGlmIChldmVudE9iai5ldmVudCA9PT0gZXZlbnQgJiYgZXZlbnRPYmouY2FsbGJhY2sudG9TdHJpbmcoKSA9PT0gY2FsbGJhY2sudG9TdHJpbmcoKSkge1xuXHRcdFx0XHRcdGNvdW50ZXIrKztcblx0XHRcdFx0fVxuXHRcdFx0fSlcblx0XHRcdGlmICghY291bnRlcikge1xuXHRcdCAgICBcdF9ldmVudHMucHVzaCh7ZXZlbnQsY2FsbGJhY2t9KTtcblx0XHRcdH1cblx0XHR9IGVsc2Uge1xuXHRcdFx0Ly8gbm8gZXZlbnQgYWRkZWQuXG5cdFx0fVxuXHR9XG5cblx0U3BqYy5wcm90b3R5cGUub25NZXNzYWdlID0gZnVuY3Rpb24gKG1zZykge1xuXHRcdGlmIChtc2cubWF0Y2goL15cXHsvKSkge1xuXHRcdFx0dmFyIGRhdGEgPSBudWxsO1xuXHRcdFx0dmFyIGVycm9yID0gbnVsbFxuXHRcdFx0dHJ5IHtcblx0XHRcdFx0ZGF0YSA9IEpTT04ucGFyc2UobXNnKTtcblx0XHRcdH0gY2F0Y2ggKGUpIHtcblx0XHRcdFx0Y29uc29sZS5lcnJvcihlKTtcblx0XHRcdH1cblxuXHRcdFx0aWYgKGVycm9yKSB7XG5cdFx0XHRcdHJldHVyblxuXHRcdFx0fSBcblxuXHRcdFx0Y29uc29sZS5sb2coZGF0YSlcblxuXHRcdFx0aWYgKCdWZXJzaW9uJyBpbiBkYXRhKSB7XG5cdFx0XHRcdHRoaXMuc3Bqc1ZlcnNpb24gPSBkYXRhLlZlcnNpb247XG5cdFx0XHRcdF90cmlnZ2VyKCd1cGRhdGUnKTtcblx0XHRcdFx0cmV0dXJuXG5cdFx0XHR9XG5cblx0XHRcdGlmICgnQ29tbWFuZHMnIGluIGRhdGEpIHtcblx0XHRcdFx0dGhpcy5jb21tYW5kcyA9IGRhdGEuQ29tbWFuZHM7XG5cdFx0XHRcdF90cmlnZ2VyKCd1cGRhdGUnKTtcblx0XHRcdFx0cmV0dXJuXG5cdFx0XHR9XG5cblx0XHRcdGlmICgnSG9zdG5hbWUnIGluIGRhdGEpIHtcblx0XHRcdFx0dGhpcy5zZXJ2ZXIgPSBkYXRhLkhvc3RuYW1lO1xuXHRcdFx0XHRfdHJpZ2dlcigndXBkYXRlJyk7XG5cdFx0XHRcdHJldHVyblxuXHRcdFx0fVxuXG5cdFx0XHRpZiAoJ1NlcmlhbFBvcnRzJyBpbiBkYXRhKSB7XG5cdFx0XHRcdHRoaXMuc2VyaWFsUG9ydHMgPSBkYXRhLlNlcmlhbFBvcnRzO1xuXHRcdFx0XHRfdHJpZ2dlcignd2FpdGluZ0ZvckdldExpc3QnKTtcblx0XHRcdFx0X3RyaWdnZXIoJ3VwZGF0ZScpO1xuXHRcdFx0XHRyZXR1cm5cblx0XHRcdH1cblxuXHRcdFx0aWYgKCdCdWZmZXJBbGdvcml0aG0nIGluIGRhdGEpIHtcblx0XHRcdFx0dGhpcy5idWZmZXJzID0gZGF0YS5CdWZmZXJBbGdvcml0aG07XG5cdFx0XHRcdF90cmlnZ2VyKCd1cGRhdGUnKTtcblx0XHRcdFx0cmV0dXJuXG5cdFx0XHR9XG5cblx0XHRcdGlmICgnQmF1ZFJhdGUnIGluIGRhdGEpIHtcblx0XHRcdFx0dGhpcy5iYXVkcmF0ZXMgPSBkYXRhLkJhdWRSYXRlO1xuXHRcdFx0XHRfdHJpZ2dlcigndXBkYXRlJyk7XG5cdFx0XHRcdHJldHVyblxuXHRcdFx0fVxuXG5cdFx0XHRpZiAoJ0NtZCcgaW4gZGF0YSkge1xuXHRcdFx0XHRzd2l0Y2ggKGRhdGEuQ21kKSB7XG5cdFx0XHRcdFx0Y2FzZSAnQ29tcGxldGUnOlxuXHRcdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdFx0Y2FzZSAnT3Blbic6XG5cdFx0XHRcdFx0XHR0aGlzLnNlcmlhbFBvcnRDb25uZWN0aW9uID0ge1xuXHRcdFx0XHRcdFx0XHRjb25uZWN0ZWQgOiB0cnVlLFxuXHRcdFx0XHRcdFx0XHRwb3J0OiBkYXRhLlBvcnQsXG5cdFx0XHRcdFx0XHRcdGJhdWRyYXRlIDogZGF0YS5CYXVkLFxuXHRcdFx0XHRcdFx0XHRidWZmZXI6IGRhdGEuQnVmZmVyVHlwZVxuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0dGhpcy5nZXRMaXN0KCk7XG5cblx0XHRcdFx0XHRcdF90cmlnZ2VyKCdzZXJpYWxQb3J0Q29ubmVjdGVkJyx0aGlzLnNlcmlhbFBvcnRDb25uZWN0aW9uKTtcblx0XHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHRcdGNhc2UgJ1F1ZXVlZCc6XG5cdFx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0XHRjYXNlICdXcml0ZSc6XG5cdFx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0XHRjYXNlICdPcGVuRmFpbCc6XG5cdFx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0XHRjYXNlICdDb21wbGV0ZUZha2UnOlxuXHRcdFx0XHRcdGNhc2UgJ0NvbXBsZXRlJzpcblx0XHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHRcdGNhc2UgJ0Vycm9yJzpcblx0XHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHRcdGNhc2UgJ0ZlZWRSYXRlT3ZlcnJpZGUnOlxuXHRcdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdH1cblx0XHRcdFx0cmV0dXJuXG5cdFx0XHR9XG5cblx0XHRcdGlmICgnRXJyb3InIGluIGRhdGEpIHtcblx0XHRcdFx0dGhpcy5lcnJvciA9IGRhdGEuRXJyb3I7XG5cdFx0XHR9XG5cblx0XHRcdGlmICgnUCcgaW4gZGF0YSAmJiAnRCcgaW4gZGF0YSkge1xuXG5cdFx0XHR9XG5cblx0XHR9XG5cdH1cbn0pKCkiXX0=
