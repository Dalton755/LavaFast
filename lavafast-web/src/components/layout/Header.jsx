import { CarFront, Building2, User } from 'lucide-react';
import { useLoja } from "../../context/LojaContext";

export default function Header() {

    const {

        lojas,

        loja,

        selecionar

    } = useLoja();

    console.log("LOJAS:", lojas);

console.log("LOJA ATUAL:", loja);

    return (

        <header className="h-16 bg-white border-b border-slate-200 shadow-sm">

            <div className="max-w-7xl mx-auto h-full px-6 flex items-center justify-between">

                <div className="flex items-center gap-3">

                    <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center">

                        <CarFront className="text-white" size={22} />

                    </div>

                    <div>

                        <h1 className="text-xl font-bold text-slate-800">

                            LavaFast ERP

                        </h1>

                        <p className="text-xs text-slate-500">

                            Gestão Operacional

                        </p>

                    </div>

                </div>

                <div className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 bg-slate-50">

                    <Building2

                        size={18}

                        className="text-slate-500"

                    />

                    <select

                        value={loja?.id ?? ""}

                        onChange={(e) => selecionar(e.target.value)}

                        className="bg-transparent text-sm font-medium outline-none"

                    >

                        {

                            lojas.map(loja => (

                                <option

                                    key={loja.id}

                                    value={loja.id}

                                >

                                    {loja.nome}

                                </option>

                            ))

                        }

                    </select>

                </div>

                <div className="flex items-center gap-2">

                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center">

                        <User size={18} />

                    </div>

                    <span className="text-sm font-medium">

                        Dalton

                    </span>

                </div>

            </div>

        </header>

    );

}