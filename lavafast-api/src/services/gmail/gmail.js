import fs from "fs";
import path from "path";

import { google } from "googleapis";
import { authenticate } from "@google-cloud/local-auth";

const SCOPES = [
    "https://www.googleapis.com/auth/gmail.readonly"
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

async function authorize() {

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

        q: "label:LOCALIZA_LAVAGEM"

    });

    return resposta.data.messages ?? [];

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

export async function obterTextoEmail(id) {

    const email = await obterEmail(id);

    const parteTexto = email.payload.parts?.find(

        parte => parte.mimeType === "text/plain"

    );

    if (!parteTexto) {

        return null;

    }

    return Buffer

        .from(

            parteTexto.body.data,

            "base64"

        )

        .toString("utf8");

}