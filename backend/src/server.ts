import 'dotenv/config';
import http from 'http';
import app from './app';
import { initSocket } from './lib/socket';
import { startJobs } from './jobs';

const PORT = parseInt(process.env.PORT || '3000', 10);

const server = http.createServer(app);

initSocket(server);
startJobs();

server.listen(PORT, () => {
  console.log(`Podomoro API running on port ${PORT}`);
});

export default server;
