import fs from "fs";
import path from "path";

import { google } from "googleapis";
import { authenticate } from "@google-cloud/local-auth";

const SCOPES = [

    "https://www.googleapis.com/auth/gmail.modify",

    "https://www.googleapis.com/auth/gmail.labels"

];

const TOKEN_PATH = path.join(
    process.cwd(),
    "credentials",
    "token.json"
);

const CREDENTIALS_PATH = path.join(
    process.cwd(),
    "credentials",
    "client_secret.json"
);

export async function authorize() {

    if (fs.existsSync(TOKEN_PATH)) {

        const token = JSON.parse(
            fs.readFileSync(TOKEN_PATH)
        );

        const credentials = JSON.parse(
            fs.readFileSync(CREDENTIALS_PATH)
        );

        const { client_secret, client_id, redirect_uris } =
            credentials.installed;

        const client = new google.auth.OAuth2(
            client_id,
            client_secret,
            redirect_uris[0]
        );

        client.setCredentials(token);

        return client;

    }

    const client = await authenticate({

        scopes: SCOPES,

        keyfilePath: CREDENTIALS_PATH

    });

    fs.writeFileSync(

        TOKEN_PATH,

        JSON.stringify(client.credentials)

    );

    return client;

}

export async function listarEmails() {

    const auth = await authorize();

    const gmail = google.gmail({

        version: "v1",

        auth

    });

    const resposta = await gmail.users.messages.list({
        userId: "me",
        q: "label:LOCALIZA_LAVAGEM newer_than:1d",
        maxResults: 1
    });

    const mensagens = resposta.data.messages ?? [];



    mensagens.forEach((m, i) => {


    });


    return mensagens;

}

export async function obterEmail(id) {

    const auth = await authorize();

    const gmail = google.gmail({

        version: "v1",

        auth

    });

    const { data } = await gmail.users.messages.get({

        userId: "me",

        id,

        format: "full"

    });

    return data;

}

function extrairParteTexto(parte) {

    if (!parte) {

        return null;

    }

    if (

        parte.mimeType === "text/plain" &&

        parte.body?.data

    ) {

        return {

            tipo: "text/plain",

            conteudo: Buffer

                .from(

                    parte.body.data,

                    "base64"

                )

                .toString("utf8")

        };

    }

    if (

        parte.mimeType === "text/html" &&

        parte.body?.data

    ) {

        return {

            tipo: "text/html",

            conteudo: Buffer

                .from(

                    parte.body.data,

                    "base64"

                )

                .toString("utf8")

        };

    }

    if (parte.parts) {

        for (const filho of parte.parts) {

            const resultado = extrairParteTexto(filho);

            if (resultado) {

                return resultado;

            }

        }

    }

    return null;

}

export async function obterTextoEmail(id) {

    const email = await obterEmail(id);





    email.payload.parts?.forEach((parte, i) => {


    });

    const parte = extrairParteTexto(email.payload);

    if (!parte) {


        return null;

    }


    return parte.conteudo;

}