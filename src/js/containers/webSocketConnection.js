import {connect} from 'react-redux'
import { spjcConnected, spjcClosed } from '../actions'
import wsConnectionView from './../components/wsconnection'

const mapStateToProps = (state, ownState) => {
	return {
		connection: state.spjcConnection
	}
}

const mapDispatchToPros = (dispatch, ownProps) => {
	return {
		spjcConnected: () => {
			dispatch(spjcConnected())
		},
		spjcClosed: () => {
			dispatch(spjcClosed())
		}
	}
}

const WsConnection = connect(
	mapStateToProps,
	mapDispatchToPros
) (wsConnectionView)

export default WsConnection