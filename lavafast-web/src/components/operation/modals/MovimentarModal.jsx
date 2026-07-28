import { OperationForms } from "../../../workflows/OperationForms";
import { useEffect, useState } from "react";
import { listarFuncionariosAtivos } from "../../../api/funcionarios";
import {
    movimentarSolicitacao,
    iniciarLavagem,
    finalizarLavagem
} from "../../../api/solicitacoes";
import FuncionarioAutocomplete from "../../common/FuncionarioAutocomplete";
import PrimaryButton from "../../common/PrimaryButton";
import SecondaryButton from "../../common/SecondaryButton";

export default function MovimentarModal({



    aberto,

    fechar,

    solicitacao

}) {

    const formulario = solicitacao
        ? OperationForms[solicitacao.status]
        : null;


    const [funcionario, setFuncionario] = useState("");

    async function confirmarMovimentacao() {

        try {



            if (solicitacao.status === "SOLICITADO") {


                await movimentarSolicitacao(

                    solicitacao.id,

                    { funcionario }

                );

            }

            else if (solicitacao.status === "AGUARDANDO") {


                await iniciarLavagem(

                    solicitacao.id,

                    { funcionario }

                );

            }

            else if (solicitacao.status === "EM_LAVAGEM") {


                await finalizarLavagem(

                    solicitacao.id,

                    { funcionario }

                );

            }


            fechar();

        }

        catch (erro) {

            console.error(erro);

            alert("Erro ao movimentar solicitação.");

        }

    }



    if (!aberto || !solicitacao) {

        return null;

    }



    return (

        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">

            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">

                <h2 className="text-2xl font-bold mb-6">

                    {formulario?.titulo}

                </h2>

                {
                    formulario?.campos.includes("funcionario") && (

                        <div className="mb-5">

                            <FuncionarioAutocomplete

                                value={funcionario}

                                onChange={setFuncionario}

                            />

                        </div>

                    )
                }

                {
                    formulario?.campos.includes("foto_recebimento") && (

                        <div className="mb-5">

                            <label className="block text-sm font-medium mb-2">

                                Foto do recebimento

                            </label>

                            <button
                                className="
                                w-full
                                rounded-xl
                                border-2
                                border-dashed
                                border-slate-300
                                py-8
                                hover:border-blue-500
                                "
                            >

                                📷 Tirar foto

                            </button>

                        </div>

                    )
                }



                <div className="flex justify-end gap-3 mt-8">

                    <SecondaryButton

                        onClick={fechar}

                    >

                        Cancelar

                    </SecondaryButton>

                    <PrimaryButton

                        disabled={!funcionario}

                        onClick={confirmarMovimentacao}

                    >

                        {formulario.botao}

                    </PrimaryButton>

                </div>

            </div>

        </div>

    );

}