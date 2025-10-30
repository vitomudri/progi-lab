import express, { type Express } from "express";
import cors from "cors";
import path from "path";
import api_router from "./routes/api.js";
import { env } from "./env.js";

const app: Express = express();

app.set("trust proxy", true);

app.use(cors({ origin: env.CORS_ORIGIN }));
app.use(express.json());
app.use(express.urlencoded());

app.use("/api", api_router);

const frontend_path: string = env.PRODUCTION ? path.join(process.cwd(), "frontend", "dist") : path.join(process.cwd(), "..", "frontend", "dist");
app.use(express.static(frontend_path));
app.use((req, res) => {
    res.sendFile(path.join(frontend_path, "index.html"));
});

app.listen(env.PORT, env.HOST);
