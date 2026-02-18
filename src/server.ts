// src/server.ts
import express, { type Application, type Request, type Response } from 'express';

const app: Application = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req: Request, res: Response) => {
  res.send('Express with TypeScript Server is running!');
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
