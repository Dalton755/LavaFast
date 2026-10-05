import fs from 'fs';
import path from 'path';

import { google } from 'googleapis';
import { authenticate } from '@google-cloud/local-auth';

const SCOPES = [
    'https://www.googleapis.com/auth/gmail.modify',
    'https://www.googleapis.com/auth/gmail.labels'
];

const TOKEN_PATH = path.join(
    process.cwd(),
    'credentials',
    'token.json'
);

const CREDENTIALS_PATH = path.join(
    process.cwd(),
    'credentials',
    'client_secret.json'
);

const DEFAULT_LABEL = process.env.GMAIL_LOCALIZA_LABEL || 'LOCALIZA_LAVAGEM';

function criarClienteComVariaveisDeAmbiente() {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;

    if (!clientId || !clientSecret || !refreshToken) {
        return null;
    }

    const client = new google.auth.OAuth2(
        clientId,
        clientSecret,
        process.env.GOOGLE_REDIRECT_URI || 'http://localhost'
    );

    client.setCredentials({
        refresh_token: refreshToken
    });

    return client;
}

export async function authorize() {
    const clientEnv = criarClienteComVariaveisDeAmbiente();

    if (clientEnv) {
        return clientEnv;
    }

    if (!fs.existsSync(CREDENTIALS_PATH)) {
        throw new Error(
            'Credenciais do Gmail ausentes. Configure GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET e GOOGLE_REFRESH_TOKEN.'
        );
    }

    if (fs.existsSync(TOKEN_PATH)) {
        const token = JSON.parse(
            fs.readFileSync(TOKEN_PATH)
        );

        const credentials = JSON.parse(
            fs.readFileSync(CREDENTIALS_PATH)
        );

        const configuracao = credentials.installed || credentials.web;

        if (!configuracao) {
            throw new Error('client_secret.json inválido.');
        }

        const {
            client_secret,
            client_id,
            redirect_uris = []
        } = configuracao;

        const client = new google.auth.OAuth2(
            client_id,
            client_secret,
            redirect_uris[0] || 'http://localhost'
        );

        client.setCredentials(token);

        return client;
    }

    const client = await authenticate({
        scopes: SCOPES,
        keyfilePath: CREDENTIALS_PATH
    });

    fs.mkdirSync(
        path.dirname(TOKEN_PATH),
        { recursive: true }
    );

    fs.writeFileSync(
        TOKEN_PATH,
        JSON.stringify(client.credentials)
    );

    return client;
}

async function obterClienteGmail() {
    const auth = await authorize();

    return google.gmail({
        version: 'v1',
        auth
    });
}

export async function listarEmails({
    query = `label:${DEFAULT_LABEL} newer_than:2d`,
    limite = 500
} = {}) {
    const gmail = await obterClienteGmail();
    const mensagens = [];
    let pageToken;

    do {
        const resposta = await gmail.users.messages.list({
            userId: 'me',
            q: query,
            maxResults: Math.min(100, Math.max(1, limite - mensagens.length)),
            pageToken
        });

        mensagens.push(...(resposta.data.messages || []));
        pageToken = resposta.data.nextPageToken;
    } while (pageToken && mensagens.length < limite);

    return mensagens.slice(0, limite);
}

export async function obterEmail(id) {
    const gmail = await obterClienteGmail();

    const { data } = await gmail.users.messages.get({
        userId: 'me',
        id,
        format: 'full'
    });

    return data;
}

export function obterCabecalhos(email) {
    const headers = email?.payload?.headers || [];

    const obter = nome =>
        headers.find(
            header =>
                String(header.name || '').toLowerCase() === nome.toLowerCase()
        )?.value || '';

    return {
        assunto: obter('Subject'),
        remetente: obter('From'),
        destinatario: obter('To')
    };
}

function extrairParteTexto(parte) {
    if (!parte) {
        return null;
    }

    if (
        parte.mimeType === 'text/plain' &&
        parte.body?.data
    ) {
        return Buffer
            .from(parte.body.data, 'base64')
            .toString('utf8');
    }

    if (parte.parts) {
        for (const filho of parte.parts) {
            const resultado = extrairParteTexto(filho);

            if (resultado) {
                return resultado;
            }
        }
    }

    if (
        parte.mimeType === 'text/html' &&
        parte.body?.data
    ) {
        return Buffer
            .from(parte.body.data, 'base64')
            .toString('utf8')
            .replace(/<br\s*\/?>/gi, '\n')
            .replace(/<\/p>/gi, '\n')
            .replace(/<[^>]+>/g, ' ')
            .replace(/&nbsp;/gi, ' ')
            .replace(/&amp;/gi, '&');
    }

    return null;
}

export async function obterTextoEmail(id, emailCarregado = null) {
    const email = emailCarregado || await obterEmail(id);
    return extrairParteTexto(email.payload);
}

export async function obterLabelId(nome = DEFAULT_LABEL) {
    const gmail = await obterClienteGmail();
    const { data } = await gmail.users.labels.list({
        userId: 'me'
    });

    const label = (data.labels || []).find(
        item => item.name === nome
    );

    if (!label?.id) {
        throw new Error(`Label do Gmail não encontrada: ${nome}`);
    }

    return label.id;
}

export async function obterPerfil() {
    const gmail = await obterClienteGmail();
    const { data } = await gmail.users.getProfile({
        userId: 'me'
    });

    return data;
}

export async function criarWatch({
    topicName = process.env.GMAIL_PUBSUB_TOPIC,
    labelName = DEFAULT_LABEL
} = {}) {
    if (!topicName) {
        throw new Error('GMAIL_PUBSUB_TOPIC não configurado.');
    }

    const gmail = await obterClienteGmail();
    const labelId = await obterLabelId(labelName);

    const { data } = await gmail.users.watch({
        userId: 'me',
        requestBody: {
            topicName,
            labelIds: [labelId],
            labelFilterBehavior: 'INCLUDE'
        }
    });

    const perfil = await obterPerfil();

    return {
        ...data,
        labelId,
        emailAddress: perfil.emailAddress
    };
}

export async function listarHistorico({
    startHistoryId,
    labelId
}) {
    if (!startHistoryId) {
        throw new Error('startHistoryId é obrigatório.');
    }

    const gmail = await obterClienteGmail();
    const messageIds = new Set();
    let pageToken;
    let historyId = String(startHistoryId);

    do {
        const { data } = await gmail.users.history.list({
            userId: 'me',
            startHistoryId: String(startHistoryId),
            labelId: labelId || undefined,
            maxResults: 100,
            pageToken
        });

        for (const registro of data.history || []) {
            for (const item of registro.messagesAdded || []) {
                if (item.message?.id) {
                    messageIds.add(item.message.id);
                }
            }

            for (const item of registro.labelsAdded || []) {
                if (item.message?.id) {
                    messageIds.add(item.message.id);
                }
            }
        }

        if (data.historyId) {
            historyId = String(data.historyId);
        }

        pageToken = data.nextPageToken;
    } while (pageToken);

    return {
        messageIds: [...messageIds],
        historyId
    };
}

export function emailPossuiLabel(email, labelId) {
    return Array.isArray(email?.labelIds) &&
        email.labelIds.includes(labelId);
}
