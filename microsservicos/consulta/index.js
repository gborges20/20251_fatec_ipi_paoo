const axios = require('axios')
const express = require('express')
const app = express()
app.use(express.json())

//estrutura de dados consolidada
const baseConsolidada = {
  usuarios: {}
}

//funções de processamento de eventos
const funcoes = {
  UsuarioCriado: async (usuario) => {
    if (!baseConsolidada.usuarios[usuario.id]) {
      baseConsolidada.usuarios[usuario.id] = {
        ...usuario,
        lembretes: {}
      }
    }
  },

  LembreteCriado: async (lembrete) => {
    //erifica se o usuário existe ou cria um básico
    if (!baseConsolidada.usuarios[lembrete.usuarioId]) {
      baseConsolidada.usuarios[lembrete.usuarioId] = {
        id: lembrete.usuarioId,
        lembretes: {}
      }
    }
    
    //adiciona o lembrete ao usuário
    baseConsolidada.usuarios[lembrete.usuarioId].lembretes[lembrete.id] = {
      ...lembrete,
      observacoes: []
    }
  },

  ObservacaoCriada: async (observacao) => {
    const usuario = baseConsolidada.usuarios[observacao.usuarioId]
    if (usuario && usuario.lembretes[observacao.lembreteId]) {
      usuario.lembretes[observacao.lembreteId].observacoes.push(observacao)
    } else {
      console.error('Lembrete não encontrado para a observação:', observacao.id)
    }
  },

  ObservacaoAtualizada: async (observacao) => {
    const usuario = baseConsolidada.usuarios[observacao.usuarioId]
    if (usuario && usuario.lembretes[observacao.lembreteId]) {
      const observacoes = usuario.lembretes[observacao.lembreteId].observacoes
      const index = observacoes.findIndex(o => o.id === observacao.id)
      if (index !== -1) {
        observacoes[index] = observacao
      }
    }
  }
}


app.get('/usuarios', (req, res) => {
  res.json(baseConsolidada)
})

app.get('/usuarios/:id', (req, res) => {
  res.json(baseConsolidada.usuarios[req.params.id] || null)
})

app.get('/usuarios/:id/lembretes', (req, res) => {
  const usuario = baseConsolidada.usuarios[req.params.id]
  res.json(usuario ? usuario.lembretes : {})
})

app.post('/eventos', async (req, res) => {
  try {
    const evento = req.body
    console.log('Processando evento:', evento.tipo)
    if (funcoes[evento.tipo]) {
      await funcoes[evento.tipo](evento.dados)
    }
  } catch (e) {
    console.error('Erro ao processar evento:', e)
  } finally {
    res.end()
  }
})

//Inicialização
const port = 6000
app.listen(port, async () => {
  console.log(`Serviço de Consulta rodando na porta ${port}`)
  
  try {
    
    const resp = await axios.get('http://localhost:10000/eventos')
    console.log(`Recuperando ${resp.data.length} eventos perdidos...`)
    
    for (const evento of resp.data) {
      try {
        if (funcoes[evento.tipo]) {
          await funcoes[evento.tipo](evento.dados)
        }
      } catch (e) {
        console.error(`Erro ao processar evento ${evento.tipo}:`, e)
      }
    }
  } catch (e) {
    console.error('Erro ao recuperar eventos perdidos:', e)
  }
})