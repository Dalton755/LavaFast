import { useLoja } from "../../context/LojaContext";

export default function FiltroLojas({ onChange }) {

    const {

        lojas,

        lojasSelecionadas,

        selecionarLojas

    } = useLoja();

    function alternar(id) {

        let novaLista;

        if (lojasSelecionadas.includes(id)) {

            novaLista = lojasSelecionadas.filter(

                x => x !== id

            );

        } else {

            novaLista = [

                ...lojasSelecionadas,

                id

            ];

        }

        selecionarLojas(novaLista );
        onChange?.();

    }

    return (

        <div className="bg-white rounded-xl shadow p-4">

            <h3 className="font-semibold mb-3">

                Lojas

            </h3>

            <div className="space-y-2">

                {

                    lojas.map(loja => (

                        <label

                            key={loja.id}

                            className="flex items-center gap-2 cursor-pointer"

                        >

                            <input

                                type="checkbox"

                                checked={lojasSelecionadas.includes(loja.id)}

                                onChange={() => alternar(loja.id)}

                            />

                            {loja.nome}

                        </label>

                    ))

                }

            </div>

        </div>

    );

}