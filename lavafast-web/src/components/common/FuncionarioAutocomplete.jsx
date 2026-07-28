import { useEffect, useState } from "react";
import { listarFuncionariosAtivos } from "../../api/funcionarios";

export default function FuncionarioAutocomplete({

    value,

    onChange,

    label = "Funcionário"

}) {

    const [funcionarios, setFuncionarios] = useState([]);

    useEffect(() => {

        async function carregar() {

            try {

                const lista = await listarFuncionariosAtivos();

                setFuncionarios(lista);

            }

            catch (erro) {

                console.error(erro);

            }

        }

        carregar();

    }, []);

    return (

        <div>

            <label className="block text-sm font-medium mb-2">

                {label}

            </label>

            <select

                value={value}

                onChange={(e) => onChange(e.target.value)}

                className="
                    w-full
                    rounded-xl
                    border
                    border-slate-300
                    px-4
                    py-3
                    outline-none
                    focus:border-blue-500
                "

            >

                <option value="">

                    Selecione...

                </option>

                {

                    funcionarios.map(funcionario => (

                        <option

                            key={funcionario.id}

                            value={funcionario.id}

                        >

                            {funcionario.nome}

                        </option>

                    ))

                }

            </select>

        </div>

    );

}