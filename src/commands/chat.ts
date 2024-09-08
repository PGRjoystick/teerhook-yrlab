import { ICommandModule, ICommandDefinition, ICommandsMap } from "../types/commands";
import { Message } from "whatsapp-web.js";

export const ChatModule: ICommandModule = {
	key: "chat",
	register: (): ICommandsMap => {
		return {
			id
		};
	}
};

const id: ICommandDefinition = {
	help: "- Get the ID of the chat",
	execute: async (message: Message) => {
		console.log(message.rawData);
		message.reply(message.to);
		message.reply(message.from);
		if (message.author) {
			message.reply(message.author);
			const groupUser: string = (message.rawData as any).notifyName as string;
			message.reply(groupUser);
			message.reply((await message.getChat()).name);
		}
	}
};
