# Serial Port Json Client (SPJC) !!!In development!!!

A Client side framework that talks with [Serial Port Json Server](https://github.com/chilipeppr/serial-port-json-server)

This project aims to create a functional javascript client-library, that talks to the Serial Port Json Server over a Websocket. It also abstracts the device communication to a unified api.

## Features
* Only functional, no connection to the DOM
* Writen in Vanilla.js
* Creates an easy to use and understand API / SDK
* Tested
* Support for:
	- Smoothieboard
	- Grbl
	- TinyG

## How to test

start SPJS (version 1.80 or higher);

```
npm install
npm run dev
```

### Why npm install if spjc doen't have dependencies
This is for the react.js app that integrates with the spjc librarie that way we can test and interact with the server over our client. In the end we are only intrested in `src/js/spjc.js`.

## API

Include script `<script type="text/javascript" src="/js/lib/spjc.js"></script>`

create object `var spjc = new Spjc('localhost')` and connects to SPJS

### Methodes

#### connect
> `spjc.connect(host)` host = 'localhost' or '127.0.0.1' (default = localhost)
> connects the client with the server

#### setUrl
> `spjc.setUrl(host)` host = 'localhost' or '127.0.0.1' (default = localhost)
> sets the full url for making the connection with the server

#### disconnect
> `spjc.disconnect()` disconnects the client from the server

#### restartSPJS
> `spjc.restartSPJS()` restarts the SPJS server, after 10 seconds the client attempts to reconnect with the server.

### getList
> `spjc.getList()` this will ask the SPJS for a list of all serial ports. This will trigger an 'Update' Event when the server responds.

### getBufferAlgorithms
> `spjc.getBufferAlgorithms()` this will ask the SPJS for a list of all buffer algorithms. This will trigger an 'Update' Event when the server responds.

... to be continued :-)


