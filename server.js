const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

const ROOT_DIR = __dirname;
const PORT = Number(process.env.PORT) || 3000;
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

function readJson(fileName) {
  return JSON.parse(fs.readFileSync(path.join(ROOT_DIR, fileName), 'utf8'));
}

function writeJson(fileName, data) {
  fs.writeFileSync(path.join(ROOT_DIR, fileName), JSON.stringify(data, null, 2));
}

function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(data));
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      if (body.length > 1e6) {
        req.socket.destroy();
        reject(new Error('Payload muito grande'));
      }
    });
    req.on('end', () => {
      if (!body) return resolve({});
      try {
        resolve(JSON.parse(body));
      } catch {
        reject(new Error('JSON inválido'));
      }
    });
    req.on('error', reject);
  });
}

function serveStatic(res, pathname) {
  const safePath = path.normalize(pathname).replace(/^([.][.][/\\])+/, '');
  const requestedPath = safePath === '/' ? '/index.html' : safePath;
  const filePath = path.join(ROOT_DIR, requestedPath);

  if (!filePath.startsWith(ROOT_DIR)) {
    sendJson(res, 403, { erro: 'Acesso negado' });
    return true;
  }

  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    return false;
  }

  const ext = path.extname(filePath).toLowerCase();
  res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream' });
  fs.createReadStream(filePath).pipe(res);
  return true;
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const { pathname } = url;

  try {
    if ((req.method === 'GET' || req.method === 'HEAD') && pathname === '/perguntas') {
      return sendJson(res, 200, readJson('perguntas.json'));
    }

    if ((req.method === 'GET' || req.method === 'HEAD') && pathname === '/ranking') {
      const usuarios = readJson('usuarios.json').sort((a, b) => b.pontos - a.pontos);
      return sendJson(res, 200, usuarios);
    }

    if (req.method === 'POST' && pathname === '/login') {
      const { nome } = await parseBody(req);
      if (!nome) return sendJson(res, 400, { erro: 'Nome obrigatório' });

      const usuarios = readJson('usuarios.json');
      let usuario = usuarios.find(u => u.nome === nome);
      if (!usuario) {
        usuario = { nome, pontos: 0, medalha: 'Nenhuma' };
        usuarios.push(usuario);
        writeJson('usuarios.json', usuarios);
      }
      return sendJson(res, 200, usuario);
    }

    if (req.method === 'POST' && pathname === '/pontos') {
      const { nome, pontos } = await parseBody(req);
      const usuarios = readJson('usuarios.json');
      const usuario = usuarios.find(u => u.nome === nome);

      if (!usuario) return sendJson(res, 404, { erro: 'Usuário não encontrado' });

      usuario.pontos += Number(pontos) || 0;
      if (usuario.pontos >= 100) usuario.medalha = '🥇 Ouro';
      else if (usuario.pontos >= 50) usuario.medalha = '🥈 Prata';
      else if (usuario.pontos >= 20) usuario.medalha = '🥉 Bronze';

      writeJson('usuarios.json', usuarios);
      return sendJson(res, 200, usuario);
    }

    if ((req.method === 'GET' || req.method === 'HEAD') && serveStatic(res, pathname)) {
      return;
    }

    sendJson(res, 404, { erro: 'Rota não encontrada' });
  } catch (error) {
    sendJson(res, 500, { erro: error.message || 'Erro interno do servidor' });
  }
});

server.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});
