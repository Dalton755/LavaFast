import {

    listarEmails,

    obterEmail

} from "./src/services/gmail/gmail.js";

import {

    parseLocaliza

} from "./src/services/localiza/parser.js";

const emails = await listarEmails();


const email = await obterEmail(emails[0].id);

const parteTexto = email.payload.parts.find(

    parte => parte.mimeType === "text/plain"

);

const corpo = Buffer.from(

    parteTexto.body.data,

    "base64"

).toString("utf8");

const resultado = parseLocaliza(corpo);

