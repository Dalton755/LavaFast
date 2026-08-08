import fs from "fs";
import path from "path";
import { reconhecerPlacaPython  } from "../services/lpr/LprService.js";
export async function reconhecerPlaca(req, res) {

    try {

        if (!req.file) {

            return res.status(400).json({

                success: false,
                message: "Nenhuma imagem enviada."

            });

        }

        const resultado = await reconhecerPlacaPython (req.file.path);

        console.log(resultado);

        return res.json(resultado);

    }

    catch (erro) {

        console.error(erro);

        return res.status(500).json({

            success: false,
            error: erro.message

        });

    }

}