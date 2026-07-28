export default function PrimaryButton({

    children,

    onClick,

    disabled = false,

    type = "button"

}) {

    return (

        <button

            type={type}

            onClick={onClick}

            disabled={disabled}

            className={`
                w-full
                py-3
                rounded-xl
                font-semibold
                transition-all

                ${
                    disabled
                        ? "bg-slate-300 cursor-not-allowed text-white"
                        : "bg-blue-600 hover:bg-blue-700 text-white"
                }
            `}

        >

            {children}

        </button>

    );

}