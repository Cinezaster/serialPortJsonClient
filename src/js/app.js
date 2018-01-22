'use-strict'

import React from 'react'
import { render } from 'react-dom'
import WebSocketConnection from './containers/webSocketConnection'
import { Provider } from 'react-redux'
import { createStore } from 'redux'
import reducer from './reducers/index'

const store = createStore(reducer,
	window.devToolsExtension && window.devToolsExtension()
)

render(
  <div>
    <h1>Serial Port Json Client</h1>
    <div className='chip'>
      <img src='https://avatars2.githubusercontent.com/u/188269?v=3&u=a47378432391435712022a2d53952785c85e8c66&s=140' alt='Toon Nelissen' /> by Cinezaster</div>
    <p>Test page for testing the client api for <a href='https://github.com/chilipeppr/serial-port-json-server' target='_blank'>Serial Port Json Server</a>.</p>
    <Provider store={store}>
      <WebSocketConnection />
    </Provider>
  </div>,
  document.getElementById('app')
)
