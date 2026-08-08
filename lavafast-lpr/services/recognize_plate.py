from paddleocr import PaddleOCR

ocr = PaddleOCR(
    use_doc_orientation_classify=False,
    use_doc_unwarping=False,
    use_textline_orientation=False,
    lang="en"
)


import re

def recognize_plate(image_path):

    resultado = ocr.predict(image_path)

    textos = resultado[0]["rec_texts"]
    scores = resultado[0]["rec_scores"]

    for texto, score in zip(textos, scores):

        texto = texto.upper().replace(" ", "")

        if re.fullmatch(r"[A-Z]{3}[0-9][A-Z][0-9]{2}", texto):

            return {
                "placa": texto,
                "confidence": round(score * 100, 2)
            }

    return {
        "placa": None,
        "confidence": 0
    }