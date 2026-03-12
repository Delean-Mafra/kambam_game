# Kanban EV GAME v1.1.0

Data de lancamento: 2026-03-12
Tipo de versao: MINOR

## Resumo
Esta release introduz uma estrutura de versionamento oficial no projeto e prepara o repositorio para publicacoes mais organizadas no GitHub Releases.

## Novidades
- Estrutura de versao centralizada em `version.py`.
- Adicionado endpoint `GET /version` para consulta da versao da aplicacao.
- Adicionado header HTTP `X-App-Version` em todas as respostas do servidor.
- Exibicao da versao no frontend (rodape da interface).
- Inclusao de metadado de versao no HTML (`application-version`).
- Documentacao de versionamento adicionada ao `README.md`.

## Arquivos alterados
- `app.py`
- `version.py` (novo)
- `templates/index.html`
- `templates/style.css`
- `README.md`

## Como validar
1. Inicie o servidor com `python app.py`.
2. Abra `http://127.0.0.1:5000/version` e confirme `"number": "1.1.0"`.
3. Abra `http://127.0.0.1:5000/health` e confirme o bloco `version`.
4. Verifique no navegador o rodape com a badge `v1.1.0`.
5. Verifique no DevTools a presenca do header `X-App-Version` nas respostas.

## Compatibilidade
- Sem alteracoes quebrando compatibilidade para uso atual da aplicacao.
- Mudancas focadas em observabilidade de versao e organizacao de release.

## Proxima release sugerida
- `v1.1.1`: correcoes pontuais identificadas em validacao manual.
- `v1.2.0`: melhorias de UX e telemetria de metricas do jogo.
