export async function reconhecerPlaca(req, res) {

    try {

        return res.status(200).json({

            success: true,
            message: "Endpoint LPR funcionando"

        });

    } catch (erro) {

        console.error(erro);

        return res.status(500).json({

            success: false,
            error: erro.message

        });

    }

}