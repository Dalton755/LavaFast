import OperationCard from './OperationCard';
import useClock from "../../hooks/useClock";
import BoardColumns from "../../config/BoardColumns";
import {

    CarFront,

    Clock3,

    Droplets,

    CircleCheck

} from 'lucide-react';

import OperationColumn from './OperationColumn';

export default function OperationBoard({


    solicitacoes = [],

    loading,

    onAction

}) {

    const now = useClock();

    function obterSolicitacoes(status) {

        const lista = solicitacoes.filter(

            item => item.status === status

        );

        switch (status) {

            case "FINALIZADA":

                return lista.sort(

                    (a, b) =>

                        new Date(b.finalizada_em) -

                        new Date(a.finalizada_em)

                );

            case "EM_LAVAGEM":

                return lista.sort(

                    (a, b) =>

                        new Date(a.iniciada_em) -

                        new Date(b.iniciada_em)

                );

            default:

                return lista.sort(

                    (a, b) =>

                        new Date(a.recebida_em) -

                        new Date(b.recebida_em)

                );

        }

    }

    console.log("Solicitações:", solicitacoes);



    return (



        <div className=" grid grid-cols-1 md:grid-cols-2
            2xl:grid-cols-4 gap-6 "
        >

            {

                BoardColumns.map(coluna => (

                    <OperationColumn

                        key={coluna.id}

                        title={coluna.titulo}

                        icon={coluna.icon}

                        color={coluna.color}

                        total={

                            obterSolicitacoes(

                                coluna.id

                            ).length

                        }

                    >

                        {

                            obterSolicitacoes(

                                coluna.id

                            ).map(solicitacao => (

                                <OperationCard

                                    key={solicitacao.id}

                                    solicitacao={solicitacao}

                                    now={now}

                                    onAction={onAction}

                                />

                            ))

                        }

                    </OperationColumn>

                ))

            }

        </div>



    );

}