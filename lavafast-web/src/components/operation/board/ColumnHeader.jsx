export default function ColumnHeader({

    title,

    icon: Icon,

    total,

    color

}) {

    return (

        <div
            className={`
                rounded-2xl
                shadow-md
                px-4
                py-4
                flex
                items-center
                justify-between
                text-white
                ${color}
            `}
        >

            <div className="flex items-center gap-3">

                <Icon size={20} />

                <span className="font-semibold">

                    {title}

                </span>

            </div>

            <span
                className="
                    bg-white/20
                    backdrop-blur
                    rounded-full
                    px-3
                    py-1
                    text-sm
                    font-semibold
                "
            >

                {total}

            </span>

        </div>

    );

}