export default function ActionButton({

    texto,

    cor,

    onClick

}) {

    return (

        <button

            onClick={onClick}

            className={`
                w-full
                h-12
                rounded-xl
                text-white
                font-semibold
                transition-all
                duration-300
                ${cor}
            `}

        >

            {texto}

        </button>

    );

}