import React, { Component } from 'react'

class Option extends Component {
  render () {
    return (
      <option value={this.props.option}>{this.props.option}</option>
    )
  }
	}

export default class SelectBox extends Component {
  constructor (props) {
    super(props)
    this.state = {
      value: ''
    }
    this._handleSelectChange = this._handleSelectChange.bind(this)
  }
  componentDidMount () {
    $(this.refs.select).material_select()
    $(this.refs.select).on('change', this._handleSelectChange)
  }
  componentDidUpdate () {
    $(this.refs.select).material_select()
  }
  componentWillUnmount () {
    $(this.refs.select).material_select('destroy')
  }
  _handleSelectChange (e) {
    var value = e.target.value
    this.props.selected(value)
    this.setState({value: value})
  }
  render () {
    var options = (this.props.options) ? this.props.options : ['/']
    return (
      <div className='input-field'>
        <select ref='select' value={this.state.value}>
          <option value='' disabled>Choose option</option>
          {options.map(function (option, index) {
            return (
              <Option key={index + option} option={option} />
            )
          })}
        </select>
        <label>{this.props.label}</label>
      </div>
    )
  }
	}
