'use strict';

(function () {
	// private variables
  var _host = 'localhost'
  var _port = '8989'
  var _events = []
  var _listeners = [
    'open',
    'close',
    'action',
    'serialList',
    'serialPortConnected',
    'position',
    'message',
    'update'
  ]
  var _buffers = ['grbl', 'smoothie', 'tinyg']
  var _baudrates = ['250000', '230400', '115200', '57600', '38400', '19200', '9600']

  var _trigger = function (event, msg, clearAfterExecution) {
    var remove = false
    var eventIndex
    _events.forEach(function (listener, index, events) {
      if (listener.event === event) {
        var message = null
        if (typeof msg === 'Event') {
          message = msg
        }
        listener.callback(message)
        eventIndex = index
      }
    })

    if (clearAfterExecution) {
      _events = _events.splice(index, 1)
    }
  }

	// main function
  window.Spjc = function (host) {
    this.host = host || _host
    this.buffers = _buffers
    this.baudrates = _baudrates
    this.server

    this.setUrl(host)

    this.connect()

    this.device = null
    this.serialPortConnection = null
  }

  Spjc.prototype.setUrl = function (host) {
    this.host = host || _host
    this.connected = false
    this.url = 'ws://' + this.host + ':' + _port + '/ws'
  }

  Spjc.prototype.connect = function (host) {
    if (host) {
      this.setUrl(host)
    }

    if (this.connection) {
      this.connection.close()
    }

    this.connection = new WebSocket(this.url)

    var that = this
    this.connection.onerror = function (e) {
      console.error(e)
      that.connected = false
      _trigger('error', e)
    }

    this.connection.onopen = function () {
      that.connected = true
      _trigger('open')

      that.getList()

      that.getBufferAlgorithms()

      that.getBaudrates()
    }

    this.connection.onmessage = function (e) {
      that.onMessage(e.data)
      _trigger('message', e.data)
    }

    this.connection.onclose = function (e) {
      console.log(e)
      _trigger('close', e)
    }
  }

  Spjc.prototype.disconnect = function () {
    this.connection.close()
  }

  Spjc.prototype.restartSPJS = function () {
    this.connection.send('restart')
    var that = this
    setTimeout(function () {
      that.connect()
    }, 10000)
  }

  Spjc.prototype.getList = function (callback) {
    if (this.connected) {
      this.connection.send('list')
      if (typeof callback === 'function') {
        _events.push({
          event: 'waitingForGetList',
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

  Spjc.prototype.send = function (message) {
    if (this.connected && this.serialPortConnection.connected) {
      this.connection.send('send ' + this.serialPortConnection.port + ' ' + message + '\n')
    }
  }

  Spjc.prototype.sendJson = function (data, id) {
    if (this.connected && this.serialPortConnection.connected) {
      var dataArray = []
      if (typeof data === 'string') {
        id = id || Math.floor(Math.random() * (9999 + 1))
        dataArray[0] = {D: data, Id: id}
      }
      if (Array.isArray(data) && !id) {
        dataArray = data
      }
      var jsonObj = {
        P: this.serialPortConnection.port,
        Data: dataArray
      }
      this.connection.send('sendjson ' + JSON.stringify(jsonObj))
    }
  }

  Spjc.prototype.connectWithSerialPort = function (connectionObject) {
    if (this.connected && connectionObject.serialPort && connectionObject.baudrate && connectionObject.buffer) {
		// first close connection
      this.closeSerialPort(connectionObject.serialPort)
      this.connection.send('open ' + connectionObject.serialPort + ' ' + connectionObject.baudrate + ' ' + connectionObject.buffer)
      this.serialPortConnection = {
        connected: false,
        port: connectionObject.serialPort,
        baudrate: connectionObject.baudrate,
        buffer: connectionObject.buffer
      }
      this.device = new Device[connectionObject.buffer]()
    }
  }

  Spjc.prototype.closeSerialPort = function (serialPort) {
    if (this.connected && typeof serialPort === 'string') {
      console.log(serialPort)
      this.connection.send('close ' + serialPort)
      this.getList()
    }
  }

  Spjc.prototype.on = function (event, callback) {
    if (_listeners.indexOf(event) >= 0) {
      var counter = 0
      _events.forEach(function (eventObj) {
        if (eventObj.event === event && eventObj.callback.toString() === callback.toString()) {
          counter++
        }
      })
      if (!counter) {
        _events.push({event, callback})
      }
    }
  }

  Spjc.prototype.onMessage = function (msg) {
    if (msg.match(/^\{/)) {
      var data = null
      var error = null
      try {
        data = JSON.parse(msg)
      } catch (e) {
        console.error(e)
        error = true
      }

      if (error) {
        return
      }

      console.log(data)

      if ('Version' in data) {
        this.spjsVersion = data.Version
        _trigger('update')
        return
      }

      if ('Commands' in data) {
        this.commands = data.Commands
        _trigger('update')
        return
      }

      if ('Hostname' in data) {
        this.server = data.Hostname
        _trigger('update')
        return
      }

      if ('SerialPorts' in data) {
        this.serialPorts = data.SerialPorts
        _trigger('waitingForGetList')
        _trigger('update')
        return
      }

      if ('BufferAlgorithm' in data) {
        this.buffers = data.BufferAlgorithm
        _trigger('update')
        return
      }

      if ('BaudRate' in data) {
        this.baudrates = data.BaudRate
        _trigger('update')
        return
      }

      if ('Cmd' in data) {
        switch (data.Cmd) {
          case 'Complete':
            break
          case 'Open':
            this.serialPortConnection.connected = true
            this.getList()

            this.sendJson(this.device.onConnectQuery)

            _trigger('serialPortConnected', this.serialPortConnection)
            break
          case 'Queued':
            break
          case 'Write':
            break
          case 'CompleteFake':
          case 'Complete':
            break
          case 'Error':
            break
          case 'FeedRateOverride':
            break
          case 'OpenFail':
          case 'Close':
            this.serialPortConnection.connected = false
            this.getList()
            break
        }
        return
      }

      if ('Error' in data) {
        this.error = data.Error
      }

      if ('P' in data && 'D' in data) {
        if (data.P === this.serialPortConnection.port) {
          this.device.parseMessage(data.D)
        }
      }
    }
  }

  function Tinyg () {
    this.onConnectQuery = [
      {D: '?\n', Id: 'tinygInit-cmd0', Pause: 150},
      {D: '{"js":1}\n', Id: 'tinygInit-cmd1', Pause: 150},
      {D: '{"sr":n}\n', Id: 'tinygInit-cmd2', Pause: 0},
      {D: '{"sv":1}\n', Id: 'tinygInit-cmd3', Pause: 50},
      {D: '{"si":250}\n', Id: 'tinygInit-cmd4', Pause: 50},
      {D: '{"qr":n}\n', Id: 'tinygInit-cmd5', Pause: 0},
      {D: '{"qv":1}\n', Id: 'tinygInit-cmd6', Pause: 50},
      {D: '{"ec":0}\n', Id: 'tinygInit-cmd7', Pause: 50},
      {D: '{"jv":4}\n', Id: 'tinygInit-cmd8', Pause: 50},
      {D: '{"hp":n}\n', Id: 'tinygInit-cmd9', Pause: 0},
      {D: '{"fb":n}\n', Id: 'tinygInit-cmd10', Pause: 0},
      {D: '{"mt":n}\n', Id: 'tinygInit-cmd11', Pause: 0},
      {D: '{"sr":{"line":t,"posx":t,"posy":t,"posz":t,"vel":t,"unit":t,"stat":t,"feed":t,"coor":t,"momo":t,"plan":t,"path":t,"dist":t,"mpox":t,"mpoy":t,"mpoz":t}}\n', Id: 'tinygInit-cmd12', Pause: 250}
    ]
    this.parseMessage = function (data) {
      var response = null
      var isJSON = true
      try {
        response = JSON.parse(data).r
      } catch (e) {
        isJSON = false
      }

      if (isJSON && response) {
        console.log(response)
        if ('sr' in response) {
          _trigger('position', {x: response.sr.posx, y: response.sr.posy, z: response.sr.posz})
        }
      } else {
        console.log(response)
        _trigger('message', response)
      }
    }
  }

  function Grbl () {
    var _detectMessageType = function (data, grbl) {
      var messageType = null

      messageType = (messageType === null && data[0] === '<' && data.indexOf('>') > -1) ? 'statusReport' : messageType
      messageType = (messageType === null && data.indexOf('[') > -1 && data.indexOf(']') > -1) ? 'feedbackMessage' : messageType
      messageType = (messageType === null && data.indexOf('ok') > -1) ? 'ok' : messageType
      messageType = (messageType === null && data.indexOf('error:') > -1) ? 'error' : messageType
      messageType = ((messageType === null || messageType === 'feedbackMessage') && data.indexOf('ALARM:') > -1) ? 'alarm' : messageType
      messageType = (messageType === null && data[0] === '$') ? 'setting' : messageType

      if (messageType === null || messageType === 'setting') {
        for (var key in grbl.controls) {
          if (grbl.controls.hasOwnProperty(key)) {
            var control = grbl.controls[key]
            if (data.indexOf(control.description) > -1) {
              messageType = 'control'
              break
            }
          }
        }
      }

      return messageType
    }

    var _checkStatusReportForError = function (rawMessageArray) {
      var messageArray = rawMessageArray
      var messageError = false

      messageError = !(messageArray[0] === 'Alarm' || messageArray[0] === 'Idle' || messageArray[0] === 'Run' || messageArray[0] === 'Queue')
      messageError = !(messageArray[1] === 'MPos' && !messageError)
      messageError = !(messageArray[5] === 'WPos' && !messageError)
      messageError = !(messageArray[9] === 'S' && !messageError)
      messageError = !(messageArray[11] === 'laser off' && !messageError)

      if (messageError) {
        console.warn(messageArray)
      }

      return messageError
    }

    this.controls = {
      '$$': {description: 'view Grbl settings', command: '$$'},
      '$#': {description: 'view # parameters', parameter: '#', command: '$#'},
      '$G': {description: 'view parser state', command: '$G'},
      '$I': {description: 'view build info', command: '$I'},
      '$N': {description: 'view startup blocks', command: '$N'},
      '$#=': {parameter: '#', description: 'save Grbl setting', value: '', command: '$#='},
      '$N#': {parameter: '#', description: 'save startup block', value: '', command: '$N#'},
      '$C': {description: 'check gcode mode', command: '$C'},
      '$X': {description: 'kill alarm lock', command: '$X'},
      '$H': {description: 'run homing cycle', command: '$H'},
      '~': {description: 'cycle start', command: '~'},
      '!': {description: 'feed hold', command: '!'},
      '?': {description: 'current status', command: '?'},
      'ctrl-x': {description: 'reset Grbl', command: 'ctrl-x'}
    }
    this.settings = {}
    this.onConnectQuery = []
    this.parseMessage = function (data) {
      data = data.replace(/[\r\n]/g, '')
      var error
      var messageType = _detectMessageType(data, this)
      var grblState = {}
      var message = {}

      if (messageType) {
        switch (messageType) {
          case 'statusReport' :
            // remove first < and last > and split on , and :
            var rawMessageArray = data.substr(data.indexOf('<') + 1, data.indexOf('>') - 1).split(/,|:/)

            if (!_checkStatusReportForError(rawMessageArray)) {
              grblState = {
                state: rawMessageArray[0],
                MPos: [rawMessageArray[2], rawMessageArray[3], rawMessageArray[4]],
                WPos: [rawMessageArray[6], rawMessageArray[7], rawMessageArray[8]],
                S: rawMessageArray[10],
                laserOff: rawMessageArray[12]
              }

              for (var key in grblState) {
                if (grblState.hasOwnProperty(key)) {
                  this[key] = grblState[key]
                }
              }
              error = false

              message = {
                messageType: messageType,
                state: grblState
              }
            } else {
              error = true
            }
            break
          case 'feedbackMessage' :
            // get grblMessages between []
            var grblFeedBackMessage = data.replace(/.*\[|\]/gi, '')
            error = false

            message = {
              messageType: messageType,
              message: grblFeedBackMessage
            }
            break
          case 'ok' :

            error = false
            message = {
              messageType: messageType,
              message: data
            }
            break
          case 'error' :
            error = false
            message = {
              messageType: messageType,
              message: data
            }
            break
          case 'alarm' :
            error = false
            message = {
              messageType: messageType,
              message: data
            }
            break
          case 'setting' :
            var isSetting = function (setting) {
              var suffix = parseInt(setting.substring(1, setting.length))
							// check if returns NaN. NaN === NaN always returns false
              return suffix === suffix
            }
            var setting = data.split('=')[0]
            if (isSetting(setting)) {
              var command = data.split('=')[0]
              var value = data.split('=')[1].split(' ')[0]
              var description = data.replace(/.*\(|\)/gi, '')
              var settings = {
                value: value,
                description: description,
                command: command
              }
              this.settings[setting] = settings
            }
            error = false

            message = {
              messageType: messageType,
              setting: settings
            }
            break
          case 'control' :
            for (var key in this.controls) {
              if (this.controls.hasOwnProperty(key)) {
                var control = this.controls[key]
                if (data.indexOf(control.description) > -1) {
                  message = {
                    messageType: messageType,
                    control: this.controls[key]
                  }
                  break
                }
              }
            }

            error = false

            break
          default:
            error = true
        }
      } else {
        error = true
      }
      return error ? 0 : message
    }
  }

  var Device = {
    tinyg: Tinyg,
    grbl: Grbl
  }
})()
