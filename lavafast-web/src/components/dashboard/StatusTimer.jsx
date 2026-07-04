import {

    Clock3,
    Droplets

} from "lucide-react";

import { formatDuration } from "../../utils/time";

export default function StatusTimer({

    status,

    inicio,

    now

}) {

    if (!inicio) return null;

    const tempo = formatDuration(

        inicio,

        now

    );

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

            {tempo}

        </div>

    );

}