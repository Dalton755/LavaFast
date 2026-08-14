import { useEffect, useState } from "react";

function calcularTempo(inicio, fim = new Date()) {

    if (!inicio) return "-";

    const inicioData = new Date(inicio);
    const fimData = new Date(fim);

    const diferenca =
        Math.max(
            0,
            fimData.getTime() - inicioData.getTime()
        );

    const totalMinutos =
        Math.floor(diferenca / 60000);

    const dias =
        Math.floor(totalMinutos / 1440);

    const horas =
        Math.floor(
            (totalMinutos % 1440) / 60
        );

    const minutos =
        totalMinutos % 60;

    if (dias > 0) {

        return `${dias}d ${horas}h ${minutos}min`;

    }

    if (horas > 0) {

        return `${horas}h ${minutos}min`;

    }

    return `${minutos}min`;

}

export default function TempoOperacao({

    inicio,

    fim,

    aoVivo = false

}) {

    const [agora, setAgora] =
        useState(new Date());

    useEffect(() => {

        if (!aoVivo || fim) return;

        const intervalo = setInterval(() => {

            setAgora(new Date());

        }, 60000);

        return () => clearInterval(intervalo);

    }, [aoVivo, fim]);

    return (

        <span>

            {calcularTempo(
                inicio,
                fim || agora
            )}

        </span>

    );

}