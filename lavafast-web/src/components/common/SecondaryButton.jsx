export default function SecondaryButton({

    children,

    onClick,

    type = "button"

}) {

    return (

        <button

            type={type}

            onClick={onClick}

            className="
                w-full
                py-3
                rounded-xl
                font-semibold
                border
                border-slate-300
                bg-white
                hover:bg-slate-100
                transition-all
            "

        >

            {children}

        </button>

    );

}