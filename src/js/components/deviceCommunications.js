import React, { Component } from 'react'
import ObjectInspector from 'react-object-inspector'

export default class DeviceCommunications extends Component {
  constructor (props) {
    super(props)
    this.state = {
      values: ['']
    }
    this.submit = this.submit.bind(this)
    this.inputChange = this.inputChange.bind(this)
  }
  submit (e) {
    e.preventDefault()
    var values = this.state.values.slice()
    this.props.spjc.send(values[values.length - 1])
    values.push('')
    this.setState({
      values: values
    })
  }
  inputChange (e) {
    var value = this.refs.serialInput.value
    var values = this.state.values.slice()
    values[this.state.values.length - 1] = value
    this.setState({
      values: values
    })
  }
  render () {
    return (
      <div>
        <ObjectInspector data={this.props.spjc.serialPortConnection} />
        <ObjectInspector data={this.props.spjc.device} />
        <ObjectInspector data={this.state.values} />
        <div className='row'>
          <form className='input-field col s12' onSubmit={this.submit}>
            <input ref='serialInput' name='serialInput' type='text' value={this.state.values[this.state.values.length - 1]} onChange={this.inputChange} />
            <label for='serialInput'>Serial input</label>
          </form>
        </div>
      </div>

    )
  }
}
