import fs from "fs";
import path from "path";

export async function reconhecerPlaca(req, res) {

    try {

        if (!req.file) {

            return res.status(400).json({

                success: false,
                message: "Nenhuma imagem enviada."

            });

        }

        return res.json({

            success: true,
            message: "Imagem recebida com sucesso.",

            arquivo: req.file.filename

        });

    }

    catch (erro) {

        console.error(erro);

        return res.status(500).json({

            success: false,
            error: erro.message

        });

    }

}