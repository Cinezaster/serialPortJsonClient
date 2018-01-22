export default function wsConnection (state = {}, action) {
  switch (action.type) {
    case 'SPJC_CONNECTED':
      return Object.assign({}, state, {
        		connected: true
      		})
      	case 'SPJC_CLOSED':
      return Object.assign({}, state, {
        		connected: false
      		})
    default: return state
  }
}
