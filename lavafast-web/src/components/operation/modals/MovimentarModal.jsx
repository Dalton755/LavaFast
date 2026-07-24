export default function MovimentarModal({

    aberto,

    fechar

}) {

    if (!aberto) {

        return null;

    }

    return (

        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">

            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">

                <h2 className="text-xl font-bold">

                    Movimentar Veículo

                </h2>

                <p className="text-slate-500 mt-2">

                    Em breve vamos selecionar o funcionário.

                </p>

                <div className="flex justify-end mt-6">

                    <button

                        onClick={fechar}

                        className="px-4 py-2 rounded-lg bg-slate-800 text-white"

                    >

                        Fechar

                    </button>

                </div>

            </div>

        </div>

    );

}