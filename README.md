# 🏭 Kanban EV - Simulador Educacional de Fluxo de Trabalho Ágil

Um simulador educacional completo de metodologia Kanban, inspirado no Kanban Board Game e Kanban EV.

## 📋 Descrição

Esta é uma aplicação web interativa que simula um ambiente de desenvolvimento de software usando metodologia Kanban. O objetivo é ensinar conceitos de:

- Gestão de fluxo de trabalho
- Limites de WIP (Work In Progress)
- Identificação de gargalos
- Lead Time e Throughput
- Gestão financeira de projetos

## 🎯 Características

- **Interface Kanban completa** com colunas: Backlog, Pronto, Análise, Desenvolvimento, Teste, Concluído
- **Sistema de dados** simulando variabilidade diária do trabalho
- **Três especialistas**: Analista, Desenvolvedor, Testador (cada um dobra eficiência na sua área)
- **Limites de WIP** configuráveis por coluna
- **Drag and Drop** para mover cartões
- **Gráficos em tempo real**:
  - CFD (Cumulative Flow Diagram)
  - Lead Time por cartão
  - Desempenho Financeiro
  - Throughput
- **Sem persistência**: Recarregar a página zera o jogo (design intencional para workshops)
- **Export/Import**: Salve e carregue estados manualmente via JSON

## 🚀 Instalação

### Pré-requisitos

- Python 3.8 ou superior
- pip (gerenciador de pacotes Python)

### Passos

1. **Clone ou baixe o projeto**

2. **Crie um ambiente virtual** (recomendado):
```bash
python -m venv venv

# Windows
venv\Scripts\activate

# Linux/Mac
source venv/bin/activate
```

3. **Instale as dependências**:
```bash
pip install -r requirements.txt
```

4. **Execute o servidor**:
```bash
python app.py
```

5. **Acesse no navegador**:
```
http://127.0.0.1:5000
```

## 🎮 Como Jogar

### Objetivo
Gerencie o fluxo de trabalho de uma equipe de desenvolvimento para entregar o máximo de valor possível, respeitando os limites de WIP e minimizando o lead time.

### Mecânica

1. **Próximo Dia**: A cada dia, dados são rolados para cada membro da equipe (1-6)
2. **Trabalho**: O valor do dado representa o trabalho realizado
3. **Especialistas**: Cada membro dobra seu valor na área de especialização
4. **Custo Diário**: R$ 300 por dia de operação
5. **Objetivo**: Maximizar valor entregue e minimizar custos

### Equipe

| Membro | Especialidade | Multiplicador |
|--------|--------------|---------------|
| 🔍 Analista | Análise | 2x |
| 💻 Desenvolvedor | Desenvolvimento | 2x |
| 🧪 Testador | Teste | 2x |

### Fluxo dos Cartões

```
Backlog → Pronto → Análise → Desenvolvimento → Teste → Concluído
```

### Limites de WIP (Padrão)

| Coluna | Limite |
|--------|--------|
| Pronto | 3 |
| Análise | 3 |
| Desenvolvimento | 4 |
| Teste | 3 |

## 📁 Estrutura do Projeto

```
kanban_ev_flask/
├── app.py                 # Servidor Flask
├── requirements.txt       # Dependências
├── README.md             # Este arquivo
├── templates/
│   └── index.html        # Template principal
└── static/
    ├── css/
    │   └── style.css     # Estilos
    └── js/
        ├── rules.js      # Regras e configurações
        ├── game.js       # Lógica do jogo
        ├── graphs.js     # Gráficos
        └── ui.js         # Interface do usuário
```

## ⚙️ Configuração

### Parâmetros do Jogo (rules.js)

```javascript
const CONFIG = {
    DAILY_COST: 300,              // Custo diário (R$)
    MAX_DAYS: 30,                 // Máximo de dias
    STALE_THRESHOLD: 5,           // Dias para cartão "parado"
    
    WIP_LIMITS: {
        backlog: Infinity,
        ready: 3,
        analysis: 3,
        development: 4,
        testing: 3,
        deployed: Infinity
    },
    
    AGENT_EFFICIENCY: {
        analyst: {
            specialtyColumn: 'analysis',
            specialtyMultiplier: 2
        },
        // ...
    }
};
```

### Cartões de Exemplo

O arquivo `rules.js` contém 20 cartões de exemplo que podem ser personalizados.

## 🧪 Testes Manuais Sugeridos

1. **Teste básico**: Mova alguns cartões pelo fluxo e observe o CFD
2. **Teste WIP**: Tente exceder o limite de WIP de uma coluna
3. **Teste financeiro**: Jogue vários dias e observe valor vs. custo
4. **Teste Export/Import**: Exporte, recarregue a página, importe

## 🛠️ Tecnologias

- **Backend**: Flask (Python) - apenas serve arquivos
- **Frontend**: HTML5, CSS3, JavaScript (vanilla)
- **Gráficos**: Canvas API nativa (sem dependências)
- **Layout**: CSS Grid/Flexbox
- **Interação**: HTML5 Drag and Drop API

## 📊 Métricas

- **Lead Time**: Tempo desde "Pronto" até "Concluído"
- **Throughput**: Cartões entregues por dia
- **CFD**: Visualização do fluxo acumulado
- **Financeiro**: Valor entregue vs. Custo operacional

## 🔒 Segurança

- Todo texto de usuário é sanitizado antes de inserir no DOM
- Não há persistência de dados no servidor
- Não há autenticação (jogo local)

## 📝 Licença

Este projeto é livre para uso educacional.

## 🙏 Créditos

Inspirado em:
- [Kanban Board Game](https://www.kanbanboardgame.com/)
- [Kanban EV](https://boardgamegeek.com/boardgame/284378/kanban-ev) por Vital Lacerda
- [getKanban](https://getkanban.com/)

---

**Desenvolvido para fins educacionais em metodologias ágeis e Kanban.**
