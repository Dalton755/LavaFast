import express from 'express';
import cors from 'cors';
import supabase from './config/supabase.js';
import localizaRoutes from './routes/localiza.js';
import solicitacoesRoutes from './routes/solicitacoes.js';
import funcionariosRoutes from "./routes/funcionarios.js";
import lojasRoutes from './routes/lojas.js';
import lavagensParticularesRoutes from './routes/lavagensParticulares.js';
import { iniciarSchedulers } from './scheduler/index.js';
import solicitacaoManualRoutes from "./routes/solicitacaoManual.js";
import tiposLavagemRoutes from "./routes/tiposLavagem.js";


const app = express();

app.use(cors());
app.use(express.json());
app.use('/api/solicitacoes', solicitacoesRoutes);
app.use("/api/funcionarios", funcionariosRoutes);
app.use(
    "/api/solicitacoes/manual",
    solicitacaoManualRoutes
);
app.use(
    "/api/tipos-lavagem",
    tiposLavagemRoutes
);

app.get('/', (req, res) => {

    res.json({
        sistema: 'LavaFast API',
        versao: '1.0.0',
        status: 'ONLINE'
    });

});

app.get('/teste', async (req, res) => {

    try {

        const { data, error } = await supabase
            .schema('operacoes')
            .from('lojas')
            .select('*');

        if (error) {

            throw error;

        }

        return res.json(data);

    }

    catch (erro) {

        console.error(erro);

        return res.status(500).json({

            erro: erro.message

        });

    }

});

app.use('/api/localiza', localizaRoutes);
app.use('/api/lojas', lojasRoutes);
app.use(
    '/api/lavagens-particulares',
    lavagensParticularesRoutes
);

export default app;