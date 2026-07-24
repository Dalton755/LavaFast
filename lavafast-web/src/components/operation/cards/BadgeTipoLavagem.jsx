const cores = {

    azul: "bg-blue-100 text-blue-700 border-blue-300",

    verde: "bg-green-100 text-green-700 border-green-300",

    laranja: "bg-orange-100 text-orange-700 border-orange-300",

    roxo: "bg-purple-100 text-purple-700 border-purple-300"

};

export default function BadgeTipoLavagem({

    nome,

    cor

}) {

    return (

        <span
            className={`
                inline-flex
                items-center
                rounded-full
                border
                px-3
                py-1
                text-xs
                font-semibold
                ${cores[cor] || "bg-slate-100 text-slate-700 border-slate-300"}
            `}
        >

            {nome}

        </span>

    );

}