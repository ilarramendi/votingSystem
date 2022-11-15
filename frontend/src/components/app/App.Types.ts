export interface State {
	scoreboard?: Record<string, number | boolean>;
	user?: string;
	passwd?: string;
	time?: number;
	vote?: number | boolean;
}
