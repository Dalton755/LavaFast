import { google } from "googleapis";

import GMAIL_LABELS from "../../constants/gmailLabels.js";

import { authorize } from "./gmail.js";

class GmailLabelService {

    async listar() {

        const auth = await authorize();
        const token = await auth.getAccessToken();


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


        return data;

    }

    async garantir(nome) {

        let label = await this.buscarPorNome(nome);

        if (label) {

            return label;

        }


        label = await this.criar(nome);

        return label;

    }

    async inicializar() {



        await this.garantir(

            GMAIL_LABELS.IMPORTADO

        );

        await this.garantir(

            GMAIL_LABELS.ERRO_IMPORTACAO

        );



    }

}

export default new GmailLabelService();