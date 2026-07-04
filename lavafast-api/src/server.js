import app from './app.js';

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log('');
    console.log('===================================');
    console.log('🚀 LavaFast API iniciada');
    console.log(`🌐 Porta: ${PORT}`);
    console.log('===================================');
    console.log('');
});