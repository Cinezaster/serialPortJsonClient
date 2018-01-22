export const spjcConnected = () => {
  return {
    type: 'SPJC_CONNECTED'
  }
}

export const spjcClosed = () => {
  return {
    type: 'SPJC_CLOSED'
  }
}

export const addMessage = (message) => {
  return {
    type: 'ADD_MESSAGE',
    message
  }
}
