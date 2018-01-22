import React, { Component } from 'react'
import SelectBox from './selectBox'
import DeviceCommunications from './deviceCommunications'

export default class HostView extends Component {
  constructor (props) {
    super(props)
    this.state = {
      host_name: 'localhost',
      serialConnection: {}
    }
    this.changeValue = this.changeValue.bind(this)
    this.connect = this.connect.bind(this)
    this.connectSerialPort = this.connectSerialPort.bind(this)
    this.disconnect = this.disconnect.bind(this)
    this.setBaudrate = this.setBaudrate.bind(this)
    this.setBuffer = this.setBuffer.bind(this)
    this.setSerialPort = this.setSerialPort.bind(this)
    this.restartSpjs = this.restartSpjs.bind(this)
    this.reloadList = this.reloadList.bind(this)
    this.reconnectToPort = this.reconnectToPort.bind(this)
  }
  changeValue (e) {
    var value = this.refs.host_name.value
    this.setState({
      host_name: value
    })
  }
  connect (e) {
    var that = this
    var spjc = new Spjc(this.state.host_name)

    var props = this.props

    spjc.on('open', function () {
      console.log('open')
      props.spjcConnected()
      that.setState({
        spjc: spjc
      })
    })

    spjc.on('close', function () {
      console.log('close')
      props.spjcClosed()
      that.setState({
        spjc: spjc
      })
    })

    spjc.on('update', function () {
      that.setState({
        spjc: spjc
      })
    })

    spjc.on('serialPortConnected', function () {
      that.setState({
        spjc: spjc
      })
    })

    this.setState({
      spjc: spjc
    })
  }
  connectSerialPort (e) {
    var spjc = this.state.spjc
    spjc.connectWithSerialPort(this.state.serialConnection)
  }
  reloadList () {
    var spjc = this.state.spjc
    spjc.getList()
  }
  closeSerialPort (serialPortName) {
    var spjc = this.state.spjc
    spjc.closeSerialPort(serialPortName)
  }
  reconnectToPort (serialPortConnectionObj) {
    var spjc = this.state.spjc
    spjc.connectWithSerialPort(serialPortConnectionObj)
  }
  disconnect (e) {
    this.state.spjc.disconnect()
  }
  restartSpjs (e) {
    this.state.spjc.restartSPJS()
  }
  setBaudrate (baudrate) {
    var stateSerialConnection = this.state.serialConnection
    var serialConnection = (JSON.parse(JSON.stringify(stateSerialConnection)))
    serialConnection.baudrate = baudrate
    this.setState({
      serialConnection: serialConnection
    })
  }
  setBuffer (buffer) {
    var stateSerialConnection = this.state.serialConnection
    var serialConnection = (JSON.parse(JSON.stringify(stateSerialConnection)))
    serialConnection.buffer = buffer
    this.setState({
      serialConnection: serialConnection
    })
  }
  setSerialPort (serialPort) {
    var stateSerialConnection = this.state.serialConnection
    var serialConnection = (JSON.parse(JSON.stringify(stateSerialConnection)))
    serialConnection.serialPort = serialPort
    this.setState({
      serialConnection: serialConnection
    })
  }
  prepSerialPortsForSelectBox (serialPorts) {
    if (serialPorts) {
      return serialPorts.map(function (serialPort) {
        return serialPort.Name
      })
    }
  }
  parametersAreSet (serialConnection) {
    return serialConnection.baudrate && serialConnection.buffer && serialConnection.serialPort
  }
  render () {
    const connection = this.props.connection
    var that = this
    return (
      <div className='row'>
        <div className='col s6'>
          <h3>SPJS</h3>
          <div className='input-field'>
            <i className='material-icons prefix'>settings_ethernet</i>
            <input
              ref='host_name'
              id='host_name'
              type='text'
              name='host'
              value={this.state.host_name}
              placeholder='Hostname'
              onChange={this.changeValue}
              disabled={connection.connected} />
            <label htmlFor='host_name'>Hostname</label>
          </div>
          {connection.connected
  ? <div>
    <button
      className='btn waves-effect waves-light col s12'
      onClick={this.disconnect}>
        Close SPJS WebSocket
    </button>
    <div className='row'>
      <div className='col s12'>
        <div className='card-panel indigo lighten-5'>
          SPJS Version: {this.state.spjc.spjsVersion}<br />
          SerialPorts:
        <ul className='collection'>
          {this.state.spjc.serialPorts
          ? this.state.spjc.serialPorts.map(function (port) {
            return (
              <li className='collection-item' key={port.Name}>
                {port.Name}
                {port.IsOpen
                ? [
                  <span key='text'> ({port.Baud} {port.BufferAlgorithm})</span>,
                  <a key='closer' onClick={that.reconnectToPort.bind(that, {serialPort: port.Name, baudrate: port.Baud, buffer: port.BufferAlgorithm})} href='#!' className='secondary-content'><i className='material-icons'>import_export</i></a>
                ]
                : null}
              </li>)
          })
          : null}
        </ul>
          <div>
            <button
              style={{width: '100%'}}
              className='btn waves-effect waves-light indigo lighten-3'
              onClick={this.reloadList}><i className='material-icons left'>replay</i>Reload list</button>
          </div>
          <br />
          Actions:
      <div>
        <button
          style={{width: '100%'}}
          className='btn waves-effect waves-light indigo lighten-3'
          onClick={this.restartSpjs}>Restart SPJS</button><br />
      </div>
          <div>
            <button style={{width: '100%'}} className='disabled btn waves-effect waves-light indigo lighten-3'>Exit SPJS</button>
          </div>
        </div>
      </div>
    </div>
  </div>
  : <button className='btn waves-effect waves-light col s12' onClick={this.connect}>Connect SPJS WebSocket</button>
}
        </div>
        {connection.connected
          ? <div className='col s6'>
            <h3>Serial Port</h3>
            {!this.state.spjc.serialPortConnection
              ? <div>
                <SelectBox options={this.state.spjc.baudrates} label='Baudrate' selected={this.setBaudrate} /><br />
                <SelectBox options={this.state.spjc.buffers} label='Buffer' selected={this.setBuffer} /><br />
                <SelectBox options={this.prepSerialPortsForSelectBox(this.state.spjc.serialPorts)} label='Serial ports' selected={this.setSerialPort} />
                <div className='row'>
                  <button className={`btn waves-effect waves-light col s12 ${this.parametersAreSet(this.state.serialConnection) ? '' : 'disabled'}`} onClick={this.connectSerialPort}>Connect Serial Port</button>
                </div>
              </div>
              : <DeviceCommunications spjc={this.state.spjc} />
            } </div>
          : null}
      </div>
    )
  }
}
