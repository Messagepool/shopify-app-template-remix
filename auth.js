import express from "express";
import { exec } from "child_process";

const app = express();
const PORT = 9000;
const HOST = "0.0.0.0";
const SHOPIFY_AUTH = "http://127.0.0.1:3456/";

app.get("/", (req, res) => {
  const command = `curl "${SHOPIFY_AUTH}?code=${req.query?.code}&state=${req.query?.state}"`;
  exec(command, (error, stdout, stderr) => {
    const response = error !== null ? "Unable to authenticate" : stdout;
    res.send(response);
  });
});

app.listen(PORT, HOST, () => {
  console.log(`Shopify auth redirect on PORT ${PORT}`);
});