const express = require("express");
const cors = require("cors");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const path = require("path");

const app = express();
const PORT = 3000;
const SECRET_KEY = "sua_chave_secreta"; // Troque por algo seguro

app.use(express.json());
app.use(cors()); // Permite que o frontend acesse a API
app.use(express.static(path.join(__dirname, "public")));


// Middleware para verificar o token nas rotas protegidas
const verificarToken = (req, res, next) => {
  const token = req.headers["authorization"];
  if (!token) return res.status(403).json({ mensagem: "Token não fornecido." });

  jwt.verify(token, SECRET_KEY, (err, decoded) => {
    if (err) return res.status(401).json({ mensagem: "Token inválido." });

    req.cpf = decoded.cpf;
    next();
  });
};

// Rota de login
app.post("/login", async (req, res) => {
  const { cpf, senha } = req.body;

  db.query("SELECT * FROM gestores WHERE cpf = ?", [cpf], async (err, results) => {
    if (err) {
      console.error("Erro no SELECT da tabela 'gestores':", err);
      return res.status(500).json({ mensagem: "Erro no servidor ao buscar gestor.", erro: err.message });
    }

    const usuario = results[0];

    if (!usuario) {
      return res.status(401).json({ mensagem: "CPF ou senha incorretos (usuário não encontrado)." });
    }

    try {
      const senhaCorreta = await bcrypt.compare(senha, usuario.senha);

      if (!senhaCorreta) {
        return res.status(401).json({ mensagem: "CPF ou senha incorretos (senha inválida)." });
      }

      const token = jwt.sign({ cpf }, SECRET_KEY, { expiresIn: "1h" });
      return res.json({ mensagem: "Login bem-sucedido!", token });

    } catch (erroComparacao) {
      console.error("Erro ao comparar a senha:", erroComparacao);
      return res.status(500).json({ mensagem: "Erro interno ao verificar senha.", erro: erroComparacao.message });
    }
  });
});

// Rota que busca alunos com médias e status de aprovação
app.get("/alunos", verificarToken, (req, res) => {
  const query = `
    SELECT a.nome, a.cpf, 
           ROUND(AVG(n.nota), 2) AS media,
           CASE WHEN AVG(n.nota) >= 8 THEN 'Aprovado' ELSE 'Reprovado' END AS status
    FROM alunos a
    JOIN notas n ON a.id = n.aluno_id
    GROUP BY a.id
  `;

  db.query(query, (err, results) => {
    if (err) {
      console.error("Erro ao buscar alunos:", err);
      return res.status(500).json({ mensagem: "Erro ao buscar alunos." });
    }

    res.json(results);
  });
});

// Inicia o servidor
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
