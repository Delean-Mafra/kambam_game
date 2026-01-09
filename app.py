from flask import Flask, render_template, jsonify

# Configuração do aplicativo Flask 
app = Flask(
    __name__,
    static_folder='static',      # Pasta para arquivos estáticos (CSS, JS, assets)
    template_folder='templates'   # Pasta para templates HTML
)

# ===================================================================================
# ROTAS
# ===================================================================================

@app.route('/')
def index():
    """
    Rota principal - renderiza a página do jogo.
    Toda a lógica do jogo está no JavaScript (client-side).
    """
    return render_template('index.html')

# Rota de verificação de saúde do servidor. Útil para testes e verificação de que o servidor está rodando.
@app.route('/health')
def health():  


    return jsonify({
        'status': 'ok',
        'message': 'Servidor Kanban EV funcionando!'
    })


# ===================================================================================
# INICIALIZAÇÃO
# ===================================================================================

if __name__ == '__main__':
    # Modo desenvolvimento - debug=True para recarregamento automático
    app.run(
        debug=True,
        host='127.0.0.1',
        port=5000
    )