const express = require('express')
const axios = require('axios')
const { v4: uuidv4 } = require('uuid')
const app = express()
app.use(express.json())

// Estrutura de dados
const usuarios = {}
const lembretesPorUsuario = {}

// Cadastro de usuário
app.post('/usuarios', async (req, res) => {
  const id = uuidv4()
  const { nome, idade, endereco } = req.body
  
  usuarios[id] = { id, nome, idade, endereco }
  lembretesPorUsuario[id] = [] // Inicializa array de lembretes

  try {
    // Publica evento no barramento
    await axios.post('http://barramento:10000/eventos', {
      tipo: 'UsuarioCriado',
      dados: usuarios[id]
    })
    
    res.status(201).json(usuarios[id])
  } catch (err) {
    console.error('Erro ao publicar evento:', err)
    res.status(500).json({ erro: 'Falha ao registrar usuário' })
  }
})

// Listagem de usuários
app.get('/usuarios', (req, res) => {
  res.json(Object.values(usuarios))
})

// Criação de lembrete para um usuário
app.post('/usuarios/:id/lembretes', async (req, res) => {
  const usuarioId = req.params.id
  const lembreteId = uuidv4()
  const { texto } = req.body

  if (!usuarios[usuarioId]) {
    return res.status(404).json({ erro: 'Usuário não encontrado' })
  }

  const lembrete = {
    id: lembreteId,
    usuarioId,
    texto,
    observacoes: []
  }

  try {
    // Armazena localmente
    lembretesPorUsuario[usuarioId].push(lembrete)
    
    // Publica evento
    await axios.post('http://localhost:10000/eventos', {
      tipo: 'LembreteCriado',
      dados: lembrete
    })
    
    res.status(201).json(lembrete)
  } catch (err) {
    console.error('Erro ao criar lembrete:', err)
    res.status(500).json({ erro: 'Falha ao processar lembrete' })
  }
})

// Listagem de lembretes por usuário
app.get('/usuarios/:id/lembretes', (req, res) => {
  const usuarioId = req.params.id
  res.json(lembretesPorUsuario[usuarioId] || [])
})

// Recebimento de eventos
app.post('/eventos', (req, res) => {
  console.log('Evento recebido:', req.body.tipo)
  res.status(200).end()
})

const port = 8000
app.listen(port, () => {
  console.log(`Microsserviço de Usuários rodando na porta ${port}`)
})