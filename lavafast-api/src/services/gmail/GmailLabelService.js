import { google } from "googleapis";

import GMAIL_LABELS from "../../constants/gmailLabels.js";

import { authorize } from "./gmail.js";

class GmailLabelService {

    async listar() {

        const auth = await authorize();
        const token = await auth.getAccessToken();

        console.log("TOKEN:", token.token ? "OK" : "NULO");

        const gmail = google.gmail({

            version: "v1",

            auth

        });

        const { data } = await gmail.users.labels.list({

            userId: "me"

        });

        return data.labels ?? [];

    }

    async buscarPorNome(nome) {

        const labels = await this.listar();

        return labels.find(

            label => label.name === nome

        ) || null;

    }

    async criar(nome) {

        const auth = await authorize();

        const gmail = google.gmail({

            version: "v1",

            auth

        });

        const { data } = await gmail.users.labels.create({

            userId: "me",

            requestBody: {

                name: nome,

                labelListVisibility: "labelShow",

                messageListVisibility: "show"

            }

        });

        console.log(`✅ Label criada: ${nome}`);

        return data;

    }

    async garantir(nome) {

        let label = await this.buscarPorNome(nome);

        if (label) {

            return label;

        }

        console.log(`📁 Criando label: ${nome}`);

        label = await this.criar(nome);

        return label;

    }

    async inicializar() {

        console.log("");
        console.log("====================================");
        console.log("Inicializando Labels do LavaFast");
        console.log("====================================");

        await this.garantir(

            GMAIL_LABELS.IMPORTADO

        );

        await this.garantir(

            GMAIL_LABELS.ERRO_IMPORTACAO

        );

        console.log("✅ Labels prontas.");
        console.log("");

    }

}

export default new GmailLabelService();