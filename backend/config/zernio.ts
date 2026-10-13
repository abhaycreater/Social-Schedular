
import "dotenv/config";
import { Zernio } from "@zernio/node";

const apiKey = process.env.ZERNIO_API_KEY;

if (!apiKey) {
    throw new Error(
        "ZERNIO_API_KEY is missing. Check your backend .env file."
    );
}

const zernio = new Zernio({
    apiKey,
});


export default zernio;