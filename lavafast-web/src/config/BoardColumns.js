import {
    CarFront,
    Clock3,
    Droplets,
    CircleCheck
} from "lucide-react";

const BoardColumns = [

    {

        id: "SOLICITADO",

        titulo: "Solicitadas",

        icon: CarFront,

        color: "bg-slate-700"

    },

    {

        id: "AGUARDANDO",

        titulo: "Aguardando",

        icon: Clock3,

        color: "bg-amber-500"

    },

    {

        id: "EM_LAVAGEM",

        titulo: "Em Lavagem",

        icon: Droplets,

        color: "bg-blue-600"

    },

    {

        id: "FINALIZADA",

        titulo: "Finalizadas",

        icon: CircleCheck,

        color: "bg-green-600"

    }

];

export default BoardColumns;