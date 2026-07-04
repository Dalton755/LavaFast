export const LOJAS = {

    ACSMC: "f79d297b-eec0-4c26-b489-e1751bcc0986",

    ACUCP: "63a249e6-0fcf-4397-a488-2d51c135e55c"

};

export const TIPOS_LAVAGEM = {

    20: "3232f730-42d4-470f-87d0-d6debd2f2167",

    35: "541ddbba-36d8-4282-a330-a9c33625b464",

    45: "9121a563-83e9-490a-a9d7-96e8ac402c58",

    55: "8715fb14-a203-4f31-9437-5e187e950b02"

};

export function obterTipoLavagem(valor){

    const numero = Number(

        String(valor)

            .replace(".","")

            .replace(",", ".")

    );

    return TIPOS_LAVAGEM[numero] ?? null;

}