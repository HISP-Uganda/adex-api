import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { writeFile } from "fs/promises";
import { exec } from "child_process";

import { cors } from "hono/cors";

const app = new Hono();

function runAzCopy(command: string) {
    return new Promise((resolve, reject) => {
        exec(`azcopy ${command}`, (error, stdout, stderr) => {
            if (error) {
                reject(`Error: ${error.message}`);
                return;
            }
            if (stderr) {
                reject(`Stderr: ${stderr}`);
                return;
            }
            resolve(stdout);
        });
    });
}

app.use("/*", cors());

app.post("/", async (c) => {
    const body = await c.req.parseBody();
    const file: any = body["file"];

    if (!file) {
        return c.json({ error: "No file uploaded" }, 400);
    }
    try {
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        await writeFile(`./${file.name}`, buffer);
        const result = await runAzCopy(
            `copy "${file.name}" "${process.env.AZURE_STORAGE_ACCOUNT_SAS_URL}"`,
        );
        return c.json(
            {
                message: "File uploaded and saved successfully",
                filename: file.name,
                result,
            },
            200,
        );
    } catch (error) {
        return c.json({ error: "Error processing file", file: file.name }, 500);
    }
});

const port = 3001;
console.log(`Server is running on port ${port}`);

serve({
    fetch: app.fetch,
    port,
});
