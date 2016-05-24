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

start SPJS (version 1.80 and higher);

```
npm install
npm run dev
```

### Why npm install if spjc doen't have dependencies
This is for the react.js app that integrates with the spjc librarie that way we can test and interact with the server over our client. In the end we are only intrested in `src/js/spjc.js`.