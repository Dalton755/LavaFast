import { useState } from "react";
import MainLayout from "../../../layouts/MainLayout";
import OperationBoard from "../../../components/operation/board/OperationBoard";
import MobileBoard from "../../../components/operation/board/MobileBoard";
import MovimentarModal from "../../../components/operation/modals/MovimentarModal";
import useMovimentacao from "../../../components/operation/hooks/useMovimentacao";
import SolicitacaoModal from "../../../components/operation/modals/SolicitacaoModal";
import useSolicitacoes from "../../../hooks/useSolicitacoes";

export default function Dashboard() {

    const {
        solicitacoes,
        loading,
        executarAcao
    } = useSolicitacoes();

    const movimentacao = useMovimentacao();
    const {

        aberto,

        abrir,

        fechar,

        solicitacao

    } = movimentacao;
    const [pesquisa, setPesquisa] = useState("");
    const [solicitacaoSelecionada, setSolicitacaoSelecionada] = useState(null);
    const solicitacoesFiltradas = solicitacoes.filter(item => {
        if (!pesquisa.trim()) return true;

        const texto = pesquisa.toLowerCase();
        return (

            item.placa?.toLowerCase().includes(texto) ||

            item.numero_solicitacao?.toString().includes(texto) ||

            item.fornecedor?.toLowerCase().includes(texto) ||

            item.responsavel_localiza?.toLowerCase().includes(texto)

        );

    });


    return (

        <MainLayout>

            <div className="flex justify-end mb-6">

                <input

                    type="text"

                    value={pesquisa}

                    onChange={(e) => setPesquisa(e.target.value)}

                    placeholder="🔍 Pesquisar placa, solicitação, fornecedor..."

                    className="w-full max-w-md rounded-xl border border-slate-300 bg-white px-4 py-3 shadow-sm outline-none focus:border-blue-500"

                />

            </div>

            <div className="hidden lg:block">

                <OperationBoard
                    loading={loading}
                    solicitacoes={solicitacoesFiltradas}
                    onAction={abrir}
                    onOpen={setSolicitacaoSelecionada}

                />

            </div>

            <div className="block lg:hidden">

                <MobileBoard
                    solicitacoes={solicitacoesFiltradas}
                    onAction={abrir}
                    onOpen={setSolicitacaoSelecionada}
                />

            </div>

            <MovimentarModal

                aberto={aberto}

                fechar={fechar}

                solicitacao={solicitacao}

            />

            <SolicitacaoModal
                aberto={!!solicitacaoSelecionada}
                solicitacao={solicitacaoSelecionada}
                fechar={() => setSolicitacaoSelecionada(null)}
            />

        </MainLayout>

    );

}