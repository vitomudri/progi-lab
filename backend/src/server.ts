import { env } from "./env.js";
import { init_database } from "./db/initDatabase.js";
import { init_email } from "./email/email.js";
import express, { type Express, type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import path from "path";
import api_router from "./api.js";

await init_database();
await init_email();

const app: Express = express();

app.set("trust proxy", true);

app.use(cors({ origin: env.CORS_ORIGIN, credentials: true}));
app.use(express.json());
app.use(express.urlencoded());
import cookieParser from "cookie-parser";

app.use(cookieParser());


app.use("/api", api_router);

const frontend_path: string = env.PRODUCTION ? path.join(process.cwd(), "public") : path.join(process.cwd(), "..", "frontend", "dist");
app.use(express.static(frontend_path));
app.use((req, res) => {
    res.sendFile(path.join(frontend_path, "index.html"));
});

app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    res.status(err.status || 500).send(err.message || "Internal Server Error");
});

app.listen(env.PORT, env.HOST, () => {
    console.log(`Listening on ${env.HOST}:${env.PORT}`);
});
