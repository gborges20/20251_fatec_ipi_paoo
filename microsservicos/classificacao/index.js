const axios = require('axios')
const express = require('express')
const { GoogleGenerativeAI } = require("@google/generative-ai")
const app = express()
app.use(express.json())

// Configuração do Gemini (simplificada)
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || 'SUA_CHAVE_AQUI')
const model = genAI.getGenerativeModel({ model: "gemini-pro" })

const classificarConteudo = async (texto) => {
  try {
    const prompt = `Analise se este texto é apropriado (sem conteúdo ilícito ou ofensivo). 
    Responda APENAS com "true" ou "false": "${texto.substring(0, 1000)}"`
    
    const result = await model.generateContent(prompt)
    const response = await result.response
    return response.text().trim().toLowerCase() === 'true'
  } catch (e) {
    console.error("Erro ao realizar a Consulta")
  }
}

const funcoes = {
  ObservacaoCriada: async (observacao) => {
     //1. Atualizar o status da observação
    //se o texto incluir a palavraChave, trocar o status para importante
    //caso contrário, trocar o status para comum

    // Classificação por tamanho (requisito 1)
    observacao.importante = observacao.texto.length >= 50
    
    // Classificação por conteúdo (requisito 2)
    observacao.apropriado = await classificarConteudo(observacao.texto)
        //emitir um evento do tipo ObservacaoClassificada, direcionado ao barramentpo
    //use a observacao como "dados"
    //emita o evento com a axios
    await axios.post('http://localhost:10000/eventos', {
      tipo: 'ObservacaoClassificada',
      dados: observacao
    })
  },
  LembreteCriado: async (lembrete) => {
    lembrete.importante = lembrete.texto.length >= 50
    lembrete.apropriado = await classificarConteudo(lembrete.texto)
    
    await axios.post('http://localhost:10000/eventos', {
      tipo: 'LembreteClassificado',
      dados: lembrete
    })
  }
}

app.post('/eventos', async (req, res) => {
  try {
    const evento = req.body
    await funcoes[evento.tipo]?.(evento.dados)
  } catch(e) {
    console.error("Erro:", e)
  } finally {
    res.end()
  }
})

const port = 7000

app.listen(port, async () => {
  console.log(`Classificação. Porta ${port}.`)
  const resp = await axios.get('http://192.168.68.110:10000/eventos')
  resp.data.forEach((eventoPerdido) => {
    try{
      funcoes[eventoPerdido.tipo](eventoPerdido.dados)
    }
    catch(e){}
  })
})