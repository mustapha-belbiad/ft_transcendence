import '../../styles/Layout.css'
import Navbar from '../../components/Navbar/Navbar'

function Chat ({ user }: any) {
	return (
		<div className="layout">
			<Navbar user={user} />
			<h1>This is your Chat Room {user.username}</h1>
		</div>
	)
}

export default Chat
