import toast from "react-hot-toast";
import NewRequestToast from "../components/notifications/NewRequestToast";

class NotificationService {

    novaSolicitacao(solicitacao) {

        toast.custom(

            (t) => (

                <div
                    className={`
                        transition-all
                        duration-300
                        ${t.visible
                            ? "animate-in fade-in zoom-in"
                            : "animate-out fade-out zoom-out"}
                    `}
                >

                    <NewRequestToast

                        solicitacao={solicitacao}

                    />

                </div>

            ),

            {

                duration: 5000

            }

        );

    }

    sucesso(texto) {

        toast.success(texto);

    }

    erro(texto) {

        toast.error(texto);

    }

}

export default new NotificationService();