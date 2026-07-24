export default function MobileTab({

    tab,

    ativo,

    total,

    onClick

}) {

    return (

        <button

            onClick={onClick}

            className={`
                min-w-[120px]
                rounded-2xl
                px-4
                py-3
                transition-all
                duration-300
                flex
                flex-col
                items-center
                justify-center
                shadow-md
                ${tab.color}
                ${ativo
                    ? "scale-105 text-white"
                    : "bg-white text-slate-700 border border-slate-200"}
            `}

        >

            <div className="text-xl">

                {tab.icon}

            </div>

            <div className="text-xs mt-1">

                {tab.title}

            </div>

            <div className="font-bold text-lg">

                {total}

            </div>

        </button>

    );

}