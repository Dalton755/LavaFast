export function formatDuration(start, now) {

    if (!start) return "--:--";

    const inicio = new Date(start);

    const diff = Math.floor(

        (now - inicio) / 1000

    );

    const horas = Math.floor(diff / 3600);

    const minutos = Math.floor(

        (diff % 3600) / 60

    );

    const segundos = diff % 60;

    return [

        horas,

        minutos,

        segundos

    ]

        .map(v => String(v).padStart(2, "0"))

        .join(":");

}