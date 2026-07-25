import { useEffect, useState } from "react";
import { Clock3, Droplets } from "lucide-react";
import { formatDuration } from "../../../utils/time";

export default function StatusTimer({

    status,

    inicio

}) {

    const [tempo, setTempo] = useState("--:--:--");

    useEffect(() => {

        console.log(
            "StatusTimer",
            now.toLocaleTimeString()
        );

        if (!inicio) return;

        function atualizar() {

            setTempo(

                formatDuration(

                    inicio,

                    new Date()

                )

            );

        }

        atualizar();

        const interval = setInterval(

            atualizar,

            1000

        );

        return () => clearInterval(interval);

    }, [inicio]);

    if (!inicio) return null;

    const Icon =

        status === "EM_LAVAGEM"

            ? Droplets

            : Clock3;

    return (

        <div
            className="
                flex
                items-center
                gap-2
                mt-5
                text-sm
                font-semibold
                text-slate-600
            "
        >

            <Icon size={16} />

            {tempo} - {Math.random()}

        </div>

    );

}