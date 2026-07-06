import app from './app.js';
import { iniciarSchedulers } from "./scheduler/index.js";
import GmailLabelService from "./services/gmail/GmailLabelService.js";

const PORT = process.env.PORT || 3000;

app.listen(PORT, async () => {

    console.log("");
    console.log("===================================");
    console.log("🚀 LavaFast API iniciada");
    console.log(`🌐 Porta: ${PORT}`);
    console.log("===================================");
    console.log("");

    await GmailLabelService.inicializar();

    iniciarSchedulers();

});