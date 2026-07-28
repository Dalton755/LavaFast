import SolicitacaoService from "../services/SolicitacaoService.js";

class LocalizaScheduler {

    iniciar() {


        setInterval(async () => {

            try {


                const resultado = await SolicitacaoService.importarDaLocaliza();


            }

            catch (erro) {

                console.error("[Scheduler]", erro.message);

            }

        }, 30000);

    }

}

export default new LocalizaScheduler();