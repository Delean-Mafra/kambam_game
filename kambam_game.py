"""
==================================================================================
 KANBAN EV GAME - Servidor Flask Principal
==================================================================================

 Simulador Educacional de Fluxo de Trabalho Ágil (Kanban)
 
 Copyright © 2026 Delean P. Mafra
 Licença: CC BY-NC 4.0 (Creative Commons Atribuição-NãoComercial 4.0)
 https://delean-mafra.github.io/Ahtools/CC_BY_NC_4.0

==================================================================================
"""

from flask import Flask, abort, render_template, jsonify, send_from_directory
import os
from version import get_version_info

# ==============================================================================
# CONFIGURAÇÃO DO APLICATIVO
# ==============================================================================

app = Flask(
    __name__,
    static_folder=None,
    template_folder='templates'
)

# Informações da licença
LICENSE_INFO = {
    'name': 'CC BY-NC 4.0',
    'full_name': 'Creative Commons Atribuição-NãoComercial 4.0 Internacional',
    'url': 'https://delean-mafra.github.io/Ahtools/CC_BY_NC_4.0',
    'author': 'Delean P. Mafra',
    'year': '2026',
    'project': 'Kanban EV GAME'
}

VERSION_INFO = get_version_info()

# ==============================================================================
# ROTAS PRINCIPAIS
# ==============================================================================

@app.route('/')
def index():
    """
    Rota principal - renderiza a página do jogo.
    Toda a lógica do jogo está no JavaScript (client-side).
    """
    return render_template('index.html', license=LICENSE_INFO, version=VERSION_INFO)


@app.route('/health')
def health():
    """
    Rota de verificação de saúde do servidor.
    Útil para testes e verificação de que o servidor está rodando.
    """
    return jsonify({
        'status': 'ok',
        'message': 'Servidor Kanban EV funcionando!',
        'license': LICENSE_INFO,
        'version': VERSION_INFO
    })


@app.route('/version')
def version():
    """Retorna metadados da versão atual da aplicação."""
    return jsonify({
        'version': VERSION_INFO,
        'license': LICENSE_INFO
    })


@app.route('/license')
def license_info():
    """
    Rota que retorna informações de licença.
    """
    return jsonify({
        'license': LICENSE_INFO,
        'terms': {
            'attribution': 'Você deve dar crédito apropriado ao autor',
            'non_commercial': 'Você não pode usar para fins comerciais',
            'share_alike': 'Modificações devem manter a mesma licença'
        }
    })


@app.route('/assets/<path:filename>')
def asset(filename: str):
    """Serve arquivos (CSS/JS/imagens) a partir de templates/ (estrutura plana)."""
    allowed_ext = {'.css', '.js', '.svg', '.png', '.jpg', '.jpeg', '.webp', '.ico'}
    _, ext = os.path.splitext(filename)
    if ext.lower() not in allowed_ext:
        abort(404)
    return send_from_directory(app.template_folder, filename)


@app.route('/favicon.ico')
def favicon():
    """Serve o favicon."""
    return send_from_directory(app.template_folder, 'favicon.svg', mimetype='image/svg+xml')


@app.after_request
def add_version_header(response):
    """Adiciona a versão da aplicação em todos os responses HTTP."""
    response.headers['X-App-Version'] = VERSION_INFO['number']
    return response


# ==============================================================================
# TRATAMENTO DE ERROS
# ==============================================================================

@app.errorhandler(404)
def not_found(error):
    """Página não encontrada."""
    return jsonify({'error': 'Página não encontrada'}), 404


@app.errorhandler(500)
def server_error(error):
    """Erro interno do servidor."""
    return jsonify({'error': 'Erro interno do servidor'}), 500


# ==============================================================================
# INICIALIZAÇÃO
# ==============================================================================

if __name__ == '__main__':
    print("""
    ╔═══════════════════════════════════════════════════════════════════════╗
    ║                                                                       ║
    ║   🏭 KANBAN EV GAME - Simulador Educacional                          ║
    ║                                                                       ║
    ║   Desenvolvido por: Delean P. Mafra                                  ║
    ║   Licença: CC BY-NC 4.0                                              ║
    ║   https://delean-mafra.github.io/Ahtools/CC_BY_NC_4.0               ║
    ║                                                                       ║
    ╚═══════════════════════════════════════════════════════════════════════╝
    """)
    
    app.run(
        debug=True,
        host='127.0.0.1',
        port=5000
    )