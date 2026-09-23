/**
 * Squad Random Events Deck in TypeScript
 */

import type { KanbanGameEngine } from './engine';

export interface SquadEventDefinition {
  id: string;
  title: string;
  badge: string;
  type: 'positive' | 'negative' | 'critical' | 'neutral';
  description: string;
  impactText: string;
  apply: (game: KanbanGameEngine) => string | void;
}

export const SQUAD_EVENTS: SquadEventDefinition[] = [
  {
    id: 'aws-outage',
    title: '🔥 Instabilidade no Provedor Cloud (AWS/GCP)',
    badge: 'Infraestrutura',
    type: 'negative',
    description: 'Serviços de infraestrutura caíram na região leste. Os desenvolvedores e DevOps gastam metade do dia restaurando clusters.',
    impactText: 'Desenvolvedores perdem 2 pontos de capacidade técnica hoje.',
    apply(game) {
      if (game.agents.dev1) game.agents.dev1.currentDice = Math.max(1, game.agents.dev1.currentDice - 2);
      if (game.agents.dev2) game.agents.dev2.currentDice = Math.max(1, game.agents.dev2.currentDice - 2);
      if (game.agents.dev3) game.agents.dev3.currentDice = Math.max(1, game.agents.dev3.currentDice - 1);
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
    description: 'Usuários não conseguem fechar o checkout no ambiente de produção! É necessário parar tudo para correção imediata.',
    impactText: 'Um cartão "HOTFIX URGENTE" entra direto em Desenvolvimento (Expedite). Bloqueia deploys até ser concluído!',
    apply(game) {
      const bugCard = {
        id: 'bug-' + Date.now().toString(36),
        code: 'BUG-P1',
        title: 'Hotfix: Falha 500 no Checkout em Produção',
        description: 'Falha crítica na integração do gateway de pagamento.',
        classOfService: 'expedite' as const,
        column: 'development' as const,
        createdDay: game.day,
        startedDay: game.day,
        completedDay: null,
        deadlineDay: game.day + 2,
        baseValue: 2200,
        currentValue: 2200,
        penaltyPerDay: 800,
        accumulatedPenalty: 0,
        effortAnalysis: 1,
        doneAnalysis: 1,
        effortDev: 3,
        doneDev: 0,
        effortTest: 2,
        doneTest: 0,
        totalEffort: 6,
        isBlocked: false,
        assignedAgents: [],
        isManual: false,
        isHighValue: false,
        bugRejectionCount: 0,
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
    description: 'Mariana (Analista de Negócios) teve indisposição médica e pegou atestado hoje.',
    impactText: 'A Analista não produz pontos de esforço neste dia.',
    apply(game) {
      if (game.agents.analyst3) {
        game.agents.analyst3.isAbsent = true;
        game.agents.analyst3.currentDice = 0;
      }
    }
  },
  {
    id: 'qa-automation-win',
    title: '⚡ Automação de Testes Pagou Dividendos',
    badge: 'Eficiência',
    type: 'positive',
    description: 'A suíte de testes de regressão criada pelo time de QA rodou em tempo recorde.',
    impactText: 'A equipe de QA ganha +2 pontos extras de esforço para cada testador hoje!',
    apply(game) {
      ['qa1', 'qa2', 'qa3'].forEach(id => {
        if (game.agents[id]) game.agents[id].currentDice += 2;
      });
    }
  },
  {
    id: 'swarming-synergy',
    title: '🤝 Pareamento (Swarming) de Alto Rendimento',
    badge: 'Colaboração',
    type: 'positive',
    description: 'Os desenvolvedores uniram forças em mob programming e resolveram o módulo mais difícil.',
    impactText: 'A tarefa em desenvolvimento com maior esforço avança 5 pontos imediatamente!',
    apply(game) {
      const devCards = game.cards.filter(c => c.column === 'development');
      if (devCards.length > 0) {
        devCards[0].doneDev = Math.min(devCards[0].effortDev, devCards[0].doneDev + 5);
        return `Cartão [${devCards[0].code}] avançou +5 pontos de desenvolvimento!`;
      }
      return 'Nenhum cartão em desenvolvimento no momento.';
    }
  },
  {
    id: 'security-audit',
    title: '🛡️ Auditoria de Segurança & LGPD',
    badge: 'Compliance',
    type: 'neutral',
    description: 'O time de cibersegurança exige checagem de vulnerabilidades em todas as tarefas prontas para entrega.',
    impactText: 'Todas as tarefas em Teste ganham +1 ponto adicional de validação.',
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
    title: '⭐ Bônus Contratual de Eficiência',
    badge: 'Financeiro',
    type: 'positive',
    description: 'O cliente aprovou as entregas recentes e concedeu um bônus por cumprimento de metas.',
    impactText: 'Caixa do squad recebe +R$ 1.000 de bonificação imediata!',
    apply(game) {
      game.financial.bonusEarned = (game.financial.bonusEarned || 0) + 1000;
      game.financial.totalRevenue += 1000;
      return 'R$ 1.000 adicionados ao faturamento!';
    }
  },
  {
    id: 'coffee-and-focus',
    title: '☕ Dia do Foco Total (No-Meeting Day)',
    badge: 'Squad',
    type: 'positive',
    description: 'Sem reuniões no dia! Todos os 9 integrantes do squad trabalharam com máxima concentração.',
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
    title: '⚠️ Falha Intermitente (Flaky Test) na Esteira',
    badge: 'Qualidade',
    type: 'negative',
    description: 'Um teste intermitente quebrou o build no pipeline de integração contínua.',
    impactText: 'Os testadores gastam 2 pontos investigando a esteira antes de testar os cartões.',
    apply(game) {
      ['qa1', 'qa2', 'qa3'].forEach(id => {
        if (game.agents[id]) game.agents[id].currentDice = Math.max(1, game.agents[id].currentDice - 2);
      });
    }
  }
];
