import MainLayout from '../layouts/MainLayout';
import OperationBoard from '../components/dashboard/OperationBoard';
import MobileBoard from "../components/dashboard/MobileBoard";

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

        </MainLayout>

    );

}