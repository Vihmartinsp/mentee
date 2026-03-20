const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();
app.use(express.json());
app.use(express.static("public"));

const PORT = 3000;

/* LOGIN */
app.post("/login", (req, res) => {
    const { nome } = req.body;
    if (!nome) return res.status(400).json({ erro: "Nome obrigatório" });

    let usuarios = JSON.parse(fs.readFileSync("usuarios.json"));
    let usuario = usuarios.find(u => u.nome === nome);

    if (!usuario) {
        usuario = { nome, pontos: 0, medalha: "Nenhuma" };
        usuarios.push(usuario);
        fs.writeFileSync("usuarios.json", JSON.stringify(usuarios, null, 2));
    }

    res.json(usuario);
});

/* SALVAR PONTOS */
app.post("/pontos", (req, res) => {
    const { nome, pontos } = req.body;

    let usuarios = JSON.parse(fs.readFileSync("usuarios.json"));
    let usuario = usuarios.find(u => u.nome === nome);

    if (usuario) {
        usuario.pontos += pontos;

        if (usuario.pontos >= 100) usuario.medalha = "🥇 Ouro";
        else if (usuario.pontos >= 50) usuario.medalha = "🥈 Prata";
        else if (usuario.pontos >= 20) usuario.medalha = "🥉 Bronze";

        fs.writeFileSync("usuarios.json", JSON.stringify(usuarios, null, 2));
    }

    res.json(usuario);
});

/* RANKING */
app.get("/ranking", (req, res) => {
    let usuarios = JSON.parse(fs.readFileSync("usuarios.json"));
    usuarios.sort((a,b)=>b.pontos-a.pontos);
    res.json(usuarios);
});

/* PERGUNTAS */
app.get("/perguntas", (req,res)=>{
    let perguntas = JSON.parse(fs.readFileSync("perguntas.json"));
    res.json(perguntas);
});

app.listen(PORT, ()=>console.log("Servidor rodando em http://localhost:3000"));