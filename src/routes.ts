import { Express, NextFunction, Request, Response } from 'express';
import { readdir } from 'fs/promises';
import { join } from 'path';

export default async function routes(app: Express) {
  app.use(helper);

  app.get('/', (req, res) => res.sendStatus(200));

  const routes = await readdir(join(__dirname, 'routes'));
  for (const route of routes) {
    app.use(`/${route.replace('.js', '')}`, require(join(__dirname, 'routes', route)).default);
  }

  app.all('*', (req, res) => res.sendStatus(404));
}

function helper(req: Request, res: Response, next: NextFunction) {
  res.success = (data, code = 200) =>
    res.status(code).send({
      ok: true,
      data,
    });
  res.error = (err, code = 400) =>
    res.status(code).send({
      ok: false,
      message: err,
    });

  next();
}
