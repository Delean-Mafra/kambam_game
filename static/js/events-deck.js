/**
 * BARALHO DE EVENTOS E CONTRATEMPOS (SQUAD DE DESENVOLVIMENTO)
 * Inspirado nos clássicos: GetKanban, Kanban EV e Kanban Board Game.
 */

const SQUAD_EVENTS = [
  {
    id: 'aws-outage',
    title: '🔥 Instabilidade no Provedor Cloud (AWS/GCP)',
    badge: 'Infraestrutura',
    type: 'negative',
    description: 'Serviços de infraestrutura caíram na região leste. Os desenvolvedores e DevOps gastam metade do dia restaurando clusters.',
    impactText: 'Desenvolvedores perdem 2 pontos de esforço hoje.',
    apply(game) {
      if (game.agents.devBack) game.agents.devBack.currentDice = Math.max(1, game.agents.devBack.currentDice - 2);
      if (game.agents.devFront) game.agents.devFront.currentDice = Math.max(1, game.agents.devFront.currentDice - 1);
    }
  },
  {
    id: 'scope-creep',
    title: '📝 Mudança de Escopo pelo Stakeholder',
    badge: 'Negócio',
    type: 'negative',
    description: 'A diretoria de produto alterou regras críticas de negócio no meio do desenvolvimento de uma funcionalidade.',
    impactText: 'A tarefa mais adiantada em Desenvolvimento recebe +3 de esforço técnico extra.',
    apply(game) {
      const devCards = game.cards.filter(c => c.column === 'development');
      if (devCards.length > 0) {
        devCards[0].effortDev += 3;
        devCards[0].totalEffort += 3;
        return `Cartão [${devCards[0].code}] teve esforço expandido em +3 pontos!`;
      }
      return 'Nenhum cartão em desenvolvimento afetado.';
    }
  },
  {
    id: 'prod-bug-p1',
    title: '🚨 Bug Crítico em Produção (Incidente P1)',
    badge: 'Emergência',
    type: 'critical',
    description: 'Usuários não conseguem fechar o carrinho de compras no ambiente de produção! É necessário parar tudo para correção imediata.',
    impactText: 'Um cartão "HOTFIX URGENTE" entra direto na coluna Análise (Expedite). Bloqueia deploys até ser concluído!',
    apply(game) {
      const bugCard = {
        id: 'bug-' + Date.now().toString(36),
        code: 'BUG-P1',
        title: 'Hotfix: Erro 500 no Checkout em Produção',
        description: 'Falha crítica na integração do gateway de pagamento.',
        classOfService: 'expedite',
        column: 'analysis',
        createdDay: game.day,
        startedDay: game.day,
        completedDay: null,
        deadlineDay: game.day + 2,
        baseValue: 2000,
        currentValue: 2000,
        penaltyPerDay: 800,
        accumulatedPenalty: 0,
        effortAnalysis: 1,
        doneAnalysis: 0,
        effortDev: 2,
        doneDev: 0,
        effortTest: 2,
        doneTest: 0,
        totalEffort: 5,
        isBlocked: false,
        assignedAgent: null,
      };
      game.cards.unshift(bugCard);
      return 'Novo chamado urgente BUG-P1 inserido no fluxo prioritário!';
    }
  },
  {
    id: 'external-api-block',
    title: '⛔ Dependência Externa Bloqueada',
    badge: 'Bloqueio',
    type: 'negative',
    description: 'A API de autenticação do parceiro bancário está fora do ar. A tarefa não pode avançar até o parceiro restabelecer o serviço.',
    impactText: 'Um cartão em Desenvolvimento fica BLOQUEADO temporariamente.',
    apply(game) {
      const devCards = game.cards.filter(c => c.column === 'development' && !c.isBlocked);
      if (devCards.length > 0) {
        devCards[0].isBlocked = true;
        return `Cartão [${devCards[0].code}] foi bloqueado por dependência externa!`;
      }
      return 'Nenhum cartão em desenvolvimento pôde ser bloqueado.';
    }
  },
  {
    id: 'analyst-flu',
    title: '🤒 Licença Médica de Membro do Squad',
    badge: 'Pessoas',
    type: 'negative',
    description: 'Sofia (Analista de Requisitos) acordou com febre e precisou pegar atestado médico hoje.',
    impactText: 'A Analista não produz pontos de esforço neste dia.',
    apply(game) {
      if (game.agents.analyst) {
        game.agents.analyst.isAbsent = true;
        game.agents.analyst.currentDice = 0;
      }
    }
  },
  {
    id: 'qa-automation-win',
    title: '⚡ Automação de Testes Pagou Dividendos',
    badge: 'Eficiência',
    type: 'positive',
    description: 'A suíte de testes ponta a ponta criada pela QA rodou em 3 minutos e validou todas as tarefas rapidamente.',
    impactText: 'Beatriz (QA) ganha +3 pontos extras de esforço hoje!',
    apply(game) {
      if (game.agents.qa) {
        game.agents.qa.currentDice += 3;
      }
    }
  },
  {
    id: 'pair-programming-surge',
    title: '🤝 Pair Programming de Alto Rendimento',
    badge: 'Colaboração',
    type: 'positive',
    description: 'Os desenvolvedores trabalharam em pareamento em um algoritmo complexo e desbloquearam uma entrega chave.',
    impactText: 'Um cartão em desenvolvimento recebe 4 pontos de progresso imediato!',
    apply(game) {
      const devCards = game.cards.filter(c => c.column === 'development');
      if (devCards.length > 0) {
        devCards[0].doneDev = Math.min(devCards[0].effortDev, devCards[0].doneDev + 4);
        return `Cartão [${devCards[0].code}] avançou 4 pontos de desenvolvimento!`;
      }
      return 'Nenhum cartão em desenvolvimento para pareamento.';
    }
  },
  {
    id: 'security-audit',
    title: '🛡️ Auditoria de Segurança & LGPD',
    badge: 'Compliance',
    type: 'neutral',
    description: 'O time de cibersegurança exige checagem de vulnerabilidades em todas as tarefas prontas para entrega.',
    impactText: 'Todas as tarefas em Teste ganham +1 ponto adicional de esforço de validação.',
    apply(game) {
      let count = 0;
      game.cards.forEach(c => {
        if (c.column === 'testing') {
          c.effortTest += 1;
          c.totalEffort += 1;
          count++;
        }
      });
      return `${count} cartão(ões) em teste receberam validação de segurança extra.`;
    }
  },
  {
    id: 'client-bonus-ontime',
    title: '⭐ Bônus de SLA do Cliente Satisfeito',
    badge: 'Financeiro',
    type: 'positive',
    description: 'O cliente elogiou a cadência de entrega das últimas semanas e adiantou um bônus contratual por pontualidade.',
    impactText: 'Caixa do squad recebe +R$ 800 de bonificação imediata!',
    apply(game) {
      game.financial.bonusEarned = (game.financial.bonusEarned || 0) + 800;
      game.financial.totalRevenue += 800;
      return 'R$ 800 adicionados ao caixa!';
    }
  },
  {
    id: 'ci-cd-pipeline-speedup',
    title: '🚀 Deploy Automatizado e Sem Fricção',
    badge: 'DevOps',
    type: 'positive',
    description: 'Melhorias nos pipelines de CI/CD permitiram homologação instantânea de tarefas finalizadas.',
    impactText: 'Qualquer cartão que completou os testes é promovido para Concluído automaticamente!',
    apply(game) {
      let moved = 0;
      game.cards.forEach(c => {
        if (c.column === 'testing' && c.doneTest >= c.effortTest) {
          game.moveCard(c.id, 'deployed');
          moved++;
        }
      });
      return `${moved} cartão(ões) em deploy automático promovidos para Concluído!`;
    }
  },
  {
    id: 'coffee-and-focus',
    title: '☕ Dia do Café Especial & Foco Total',
    badge: 'Squad',
    type: 'positive',
    description: 'Sem reuniões no dia ("No-Meeting Day")! O time trabalhou em estado de fluxo contínuo e concentração máxima.',
    impactText: 'Todos os membros do squad rolam dados com valor mínimo de 4 hoje!',
    apply(game) {
      Object.values(game.agents).forEach(agent => {
        if (!agent.isAbsent) {
          agent.currentDice = Math.max(4, agent.currentDice);
        }
      });
    }
  },
  {
    id: 'flaky-test-pipeline',
    title: '⚠️ Teste Intermitente (Flaky Test) no Build',
    badge: 'Qualidade',
    type: 'negative',
    description: 'Um teste intermitente quebrou a esteira de integração contínua sem motivo aparente.',
    impactText: 'Beatriz (QA) gasta 2 pontos investigando a esteira antes de testar os cartões.',
    apply(game) {
      if (game.agents.qa) {
        game.agents.qa.currentDice = Math.max(1, game.agents.qa.currentDice - 2);
      }
    }
  }
];

window.SQUAD_EVENTS = SQUAD_EVENTS;
