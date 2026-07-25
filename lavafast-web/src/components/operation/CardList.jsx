import OperationCard from "./cards/OperationCard";

export default function CardList({

    cards,

    now,

    onAction

}) {

    console.count("CardList");

    return (

        <div className="flex flex-col gap-4">

            {

                cards.map(card => (

                    <OperationCard

                        key={card.id}

                        solicitacao={card}

                        now={now}

                        onAction={onAction}

                    />

                ))

            }

        </div>

    );

}