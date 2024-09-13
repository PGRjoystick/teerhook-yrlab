import color from "picocolors";

export const print = (text: string) => {
	console.log(color.bgCyan("◇") + "  " + text);
};

export const printError = (text: string) => {
	console.log(color.red("◇") + "  " + text);
};

export const printIntro = () => {
	console.log("");
	console.log(color.green(color.white(" Teerhook for Yuri-Lab Project ")));
	console.log("|-----------------------------------------------------------|");
	console.log("|        Server Webhook untuk donasi Yuri-Lab        |");
	console.log("|-----------------------------------------------------------|");
	console.log("");
};

export const printQRCode = (qr: string) => {
	console.log(qr);
	console.log("Scan kode QR dibawah ini untuk login ke whatsapp web");
};

export const printLoading = () => {
	console.log("Loading...");
};

export const printAuthenticated = () => {
	console.log("Authenticated, session started!");
};

export const printAuthenticationFailure = () => {
	console.log("Duh, Autentikasi gagal :( ");
};

export const printOutro = () => {
	console.log("");
	console.log("Yosh...!");
	console.log("Ayana sudah siap menangkap semua donasi yang masuk nich....");
};
