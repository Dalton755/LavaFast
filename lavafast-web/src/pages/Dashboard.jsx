import MainLayout from '../layouts/MainLayout';
import OperationBoard from "../components/operation/board/OperationBoard";
import MobileBoard from "../components/operation/board/MobileBoard";

import MovimentarModal from "../components/operation/modals/MovimentarModal";
import useMovimentacao from "../components/operation/hooks/useMovimentacao";

import useSolicitacoes from '../hooks/useSolicitacoes';
import useClock from "../hooks/useClock";
import { useEffect } from "react";
import supabase from "../lib/supabase";

export default function Dashboard() {

    const {

        solicitacoes,

        loading,

        executarAcao

    } = useSolicitacoes();

    const now = useClock();
    const movimentacao = useMovimentacao();


    return (

        <MainLayout>

            <div className="hidden lg:block">

                <OperationBoard

                    loading={loading}

                    solicitacoes={solicitacoes}

                    now={now}

                    onAction={executarAcao}

                />

            </div>

            <div className="block lg:hidden">

                <MobileBoard

                    solicitacoes={solicitacoes}

                    now={now}

                    onAction={executarAcao}

                />

            </div>

            <MovimentarModal

                aberto={movimentacao.aberto}

                fechar={movimentacao.fechar}

            />

        </MainLayout>

    );

}