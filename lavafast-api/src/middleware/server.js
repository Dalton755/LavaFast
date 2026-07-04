import app from './app.js';

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {

    console.clear();

    console.log('');
    console.log('====================================');
    console.log('🚀 LavaFast API');
    console.log('====================================');
    console.log(`Servidor iniciado na porta ${PORT}`);
    console.log('====================================');
    console.log('');

});