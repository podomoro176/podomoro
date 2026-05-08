import 'dotenv/config';
import http from 'http';
import app from './app';

const PORT = parseInt(process.env.PORT || '3000', 10);

const server = http.createServer(app);

server.listen(PORT, () => {
  console.log(`Podomoro API running on port ${PORT}`);
});

export default server;
