import { ICommandsMap } from "./commands";

export interface IAiConfig {
	commandsMap: {
		[key: string]: ICommandsMap;
	};
}
