import 'dotenv/config';
import express from 'express';

const app = express();

app.get('/', (req, res) => res.sendStatus(200));

app.listen(process.env.PORT, () => console.log('Server Online!'));
