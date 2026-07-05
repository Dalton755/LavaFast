import { CarFront, MapPin, Sparkles } from "lucide-react";

export default function NewRequestToast({ solicitacao }) {

    return (

        <div className="bg-white rounded-2xl shadow-2xl border border-blue-200 p-4 w-80">

            <div className="flex items-center gap-3">

                <div className="w-11 h-11 rounded-xl bg-blue-600 flex items-center justify-center">

                    <CarFront className="text-white" size={22} />

                </div>

                <div>

                    <h2 className="font-bold text-slate-800">

                        Nova Solicitação

                    </h2>

                    <p className="text-xs text-slate-500">

                        Recebida agora

                    </p>

                </div>

            </div>

            <div className="mt-4">

                <div className="text-3xl font-extrabold tracking-wider">

                    {solicitacao.placa}

                </div>

            </div>

            <div className="mt-4 flex items-center gap-2 text-slate-600">

                <MapPin size={16} />

                {solicitacao.codigo_agencia ?? "Agência"}

            </div>

            <div className="mt-2 flex items-center gap-2 text-slate-600">

                <Sparkles size={16} />

                {solicitacao.tipo_lavagem ?? "Lavagem Padrão"}

            </div>

        </div>

    );

}