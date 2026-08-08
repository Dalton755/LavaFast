from fastapi import FastAPI, UploadFile, File
from services.recognize_plate import recognize_plate

app = FastAPI()


@app.get("/")
async def home():
    return {
        "status": "online",
        "sistema": "LavaFast LPR"
    }


@app.post("/ocr")
async def ocr(file: UploadFile = File(...)):

    caminho = f"temp_{file.filename}"

    with open(caminho, "wb") as buffer:
        buffer.write(await file.read())

    resultado = recognize_plate(caminho)

    return resultado