import {Component} from 'preact';
import {w3cwebsocket as WSClient} from 'websocket';
import type {State} from './App.Types';

import styles from './App.scss';

const nums = [
	1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22,
	23, 24, 25
];

export default class App extends Component<Record<string, unknown>, State> {
	client: WSClient;
	state: State = {passwd: localStorage.getItem('passwd')};
	constructor(props) {
		super(props);
		this.connect = this.connect.bind(this);
		this.vote = this.vote.bind(this);
	}

	connect() {
		this.client = new WSClient(
			`ws://localhost:8080?passwd=${this.state.passwd}&user=${this.state.user}`
		);
		this.client.addEventListener('message', m => {
			const json = JSON.parse(m.data);

			if (!localStorage.getItem('passwd') && json.type !== 'error')
				localStorage.setItem('passwd', this.state.passwd);
			console.log('recived:', json);

			switch (json.type) {
				case 'scoreboard':
					this.setState({scoreboard: json.scoreboard});
					break;
				case 'vote':
					this.setState(({scoreboard}) => {
						scoreboard[json.user] = json.score;
						return {scoreboard};
					});

					break;
				case 'error':
					console.error(json.message);
					this.setState({passwd: undefined, user: undefined});
					localStorage.clear();
					break;
				case 'time':
					this.setState({time: json.time});
					break;
				case 'reset':
					this.setState({scoreboard: json.scoreboard, vote: undefined, time: undefined});
					break;
				default:
					break;
			}
		});
	}

	vote(value: number | boolean) {
		this.setState({vote: value});
		this.client.send(
			JSON.stringify({
				type: 'vote',
				value
			})
		);
	}

	render(props, {scoreboard, user, passwd, time, vote}) {
		return passwd ? (
			user ? (
				<>
					{scoreboard &&
						Object.keys(scoreboard).map(user => (
							<div key={user}>
								<h2 className={scoreboard[user] && styles.userSelected}>
									{user}
								</h2>
								{typeof scoreboard[user] === 'number' && (
									<label>score: {scoreboard[user]}</label>
								)}
							</div>
						))}

					{time === 0 ? (
						<button
							onClick={() =>
								this.setState({time: undefined}, () =>
									this.client.send('{"type": "reset"}')
								)
							}>
							Reset
						</button>
					) : (
						<>
							{time}
							<div>
								{nums.map(n => (
									<button
										className={vote === n && styles.selected}
										disabled={time === 0}
										key={n}
										onClick={() => this.vote(n)}>
										{n}
									</button>
								))}
								<button
									className={styles.reset}
									disabled={time === 0}
									onClick={() => this.vote(false)}>
									Clear
								</button>
							</div>
							<button
								disabled={time ?? false}
								onClick={() => this.client.send('{"type": "calculate"}')}>
								Calculate
							</button>
						</>
					)}
				</>
			) : (
				<>
					<h2>Enter your username</h2>
					<input id='username' value='' />
					<button
						onClick={() =>
							this.setState(
								{user: (document.getElementById('username') as any).value},
								this.connect
							)
						}>
						Next
					</button>
				</>
			)
		) : (
			<>
				<h2>Password</h2>
				<input id='passwd' value='' />
				<button
					onClick={() =>
						this.setState({
							passwd: (document.getElementById('passwd') as any).value
						})
					}>
					Next
				</button>
			</>
		);
	}
}
