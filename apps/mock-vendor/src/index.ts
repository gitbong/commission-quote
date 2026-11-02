import { createApp } from "./app";

const port = Number(process.env.PORT ?? 5001);

createApp().listen(port, () => {
  console.log(`mock vendor listening on http://localhost:${port}`);
});
