import SolicitacaoService from "../services/SolicitacaoService.js";

class LocalizaScheduler {

    iniciar() {

        console.log("");

        console.log("====================================");
        console.log("Scheduler Localiza iniciado");
        console.log("====================================");

        setInterval(async () => {

            try {

                console.log("[Scheduler] Verificando novos e-mails...");

                const resultado = await SolicitacaoService.importarDaLocaliza();

                console.log("[Scheduler]", resultado);

            }

            catch (erro) {

                console.error("[Scheduler]", erro.message);

            }

        }, 30000);

    }

}

export default new LocalizaScheduler();