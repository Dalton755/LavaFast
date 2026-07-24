import ColumnHeader from './ColumnHeader';

export default function OperationColumn({

    title,

    icon,

    total,

    color,

    children

}) {

    return (

        <div className="flex flex-col">

            <ColumnHeader

                title={title}

                icon={icon}

                total={total}

                color={color}

            />

            <div
                className="
                    mt-3
                    rounded-2xl
                    bg-white/80
                    backdrop-blur-sm
                    border
                    border-slate-200
                    shadow-sm
                    min-h-[420px]
                    lg:min-h-[calc(100vh-230px)]
                    p-3 md:p-4
                "
            >

                {children}

            </div>

        </div>

    );

}