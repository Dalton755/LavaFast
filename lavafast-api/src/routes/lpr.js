import { Router } from "express";
import multer from "multer";
import path from "path";

import { reconhecerPlaca } from "../controllers/LprController.js";

const router = Router();

const storage = multer.diskStorage({

    destination(req, file, cb) {

        cb(null, "uploads");

    },

    filename(req, file, cb) {

        cb(

            null,

            Date.now() +

            path.extname(file.originalname)

        );

    }

});

const upload = multer({

    storage

});

router.post(

    "/",

    upload.single("imagem"),

    reconhecerPlaca

);

export default router;