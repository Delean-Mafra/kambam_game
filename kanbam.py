from flask import Flask, render_template_string, request, jsonify
import json
import os
from datetime import datetime
import uuid

app = Flask(__name__)

DATA_FILE = 'dados.json'
FLOW_ORDER = ["backlog", "sprint_backlog", "andamento", "concluido"]

# --- FUNÇÕES DE PERSISTÊNCIA ---
def load_data():
    if not os.path.exists(DATA_FILE):
        return {"tasks": []}
    with open(DATA_FILE, 'r', encoding='utf-8') as f:
        return json.load(f)

def save_data(data):
    with open(DATA_FILE, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=4, ensure_ascii=False)

# --- HTML/CSS/JS ---
PAGE_HTML = """
<!DOCTYPE html>
<html lang="pt-br">
<head>
    <meta charset="UTF-8">
    <title>Agile Kanban Analytics</title>
    <script src="https://cdn.jsdelivr.net/npm/sortablejs@1.15.0/Sortable.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <style>
        body { background-color: #f4f5f7; font-family: sans-serif; font-size: 16px; }
        .kanban-container { display: flex; overflow-x: auto; padding: 20px; gap: 15px; align-items: flex-start; }
        .column { background-color: #ebecf0; border-radius: 8px; min-width: 280px; max-width: 280px; display: flex; flex-direction: column; max-height: 85vh; shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .column-header { padding: 12px; font-weight: bold; font-size: 1.05rem; background: #dfe1e6; border-radius: 8px 8px 0 0; }
        .task-list { padding: 8px; flex-grow: 1; min-height: 100px; overflow-y: auto; }
        .card-task { background: white; border-radius: 4px; padding: 10px; margin-bottom: 8px; box-shadow: 0 1px 2px rgba(0,0,0,0.2); cursor: grab; border-left: 5px solid #ccc; font-size: 0.98rem; }
        
        /* Prioridades */
        .priority-baixa { border-left-color: #61bd4f; }
        .priority-media { border-left-color: #f2d600; }
        .priority-alta { border-left-color: #ff9f1a; }
        .priority-urgente { border-left-color: #eb5a46; }

        .time-badge { font-size: 0.9rem; display: block; color: #6b778c; margin-top: 4px; border-bottom: 1px solid #eee; }
        .analytics-section { background: white; padding: 20px; margin: 20px; border-radius: 10px; box-shadow: 0 4px 10px rgba(0,0,0,0.05); }
        .analytics-section h3 { font-size: 1.4rem; }
        .analytics-section h5 { font-size: 1.1rem; }
        .btn-add { border: none; background: transparent; color: #5e6c84; padding: 10px; text-align: left; font-size: 0.98rem; }
        .btn-add:hover { background: #dadbe2; border-radius: 0 0 8px 8px; }
    </style>
</head>
<body>

<nav class="navbar navbar-dark bg-primary px-4">
    <span class="navbar-brand mb-0 h1">📊 Kanban Performance Analytics</span>
    <button class="btn btn-light btn-sm" onclick="toggleAnalytics()">Ver Gráficos de Desempenho</button>
</nav>

<!-- Seção de Gráficos (Oculta por padrão) -->
<div id="analyticsArea" class="analytics-section" style="display:none;">
    <h3>Métricas de Agilidade</h3>
    <div class="row text-center">
        <div class="col-md-6">
            <h5>Tempo Médio por Etapa (Dias)</h5>
            <canvas id="timeChart"></canvas>
        </div>
        <div class="col-md-6">
            <h5>Distribuição de Urgência</h5>
            <canvas id="priorityChart"></canvas>
        </div>
    </div>
</div>

<div class="kanban-container">
    {% for col_id, col_name in columns.items() %}
    <div class="column">
        <div class="column-header">{{ col_name }}</div>
        <div class="task-list" id="{{ col_id }}" data-column="{{ col_id }}">
            {% for task in tasks if task.column == col_id %}
            <div class="card-task priority-{{ task.priority }}" data-id="{{ task.id }}">
                <div class="fw-bold">{{ task.title }}</div>
                <div class="text-muted" style="font-size:0.95rem;">{{ task.description }}</div>
                
                <div class="mt-2">
                    <span class="time-badge">📥 Criado: {{ task.timestamps.backlog or 'N/A' }}</span>
                    {% if task.timestamps.sprint_backlog %}
                        <span class="time-badge">🔍 Sprint: {{ task.timestamps.sprint_backlog }}</span>
                    {% endif %}
                    {% if task.timestamps.andamento %}
                        <span class="time-badge">🚀 Início: {{ task.timestamps.andamento }}</span>
                    {% endif %}
                    {% if task.timestamps.concluido %}
                        <span class="time-badge">✅ Fim: {{ task.timestamps.concluido }}</span>
                    {% endif %}
                </div>
                <div class="mt-1" style="font-size: 0.9rem;">
                    <strong>Entrega:</strong> <span class="badge bg-light text-dark">{{ task.deadline }}</span>
                </div>
                <button
                    type="button"
                    class="btn btn-outline-secondary btn-sm mt-2 w-100"
                    data-id="{{ task.id }}"
                    data-description="{{ task.description }}"
                    data-deadline="{{ task.deadline }}"
                    data-priority="{{ task.priority }}"
                    onclick="openEditModal(this)">
                    Editar
                </button>
            </div>
            {% endfor %}
        </div>
        <button class="btn-add" onclick="openModal('{{ col_id }}')">+ Adicionar Card</button>
    </div>
    {% endfor %}
</div>

<!-- Modal de Edição -->
<div class="modal fade" id="editTaskModal" tabindex="-1">
    <div class="modal-dialog">
        <form class="modal-content" action="/edit" method="POST">
            <div class="modal-header">
                <h5 class="modal-title">Editar Card</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body">
                <input type="hidden" name="id" id="edit_id">
                <div class="mb-3">
                        <label>Descrição</label>
                        <textarea name="description" id="edit_description" class="form-control"></textarea>
                </div>
                <div class="mb-3">
                        <label>Previsão de Entrega</label>
                        <input type="date" name="deadline" id="edit_deadline" class="form-control" required>
                </div>
                <div class="mb-3">
                        <label>Urgência</label>
                        <select name="priority" id="edit_priority" class="form-select">
                                <option value="baixa">Baixa</option>
                                <option value="media">Média</option>
                                <option value="alta">Alta</option>
                                <option value="urgente">Urgente</option>
                        </select>
                </div>
            </div>
            <div class="modal-footer">
                <button type="submit" class="btn btn-primary">Salvar Alterações</button>
            </div>
        </form>
    </div>
</div>

<!-- Modal -->
<div class="modal fade" id="taskModal" tabindex="-1">
  <div class="modal-dialog">
    <form class="modal-content" action="/add" method="POST">
      <div class="modal-header"><h5>Novo Item de Trabalho</h5></div>
      <div class="modal-body">
            <input type="hidden" name="column" id="modal_column">
            <div class="mb-3"><label>Título</label><input type="text" name="title" class="form-control" required></div>
            <div class="mb-3"><label>Descrição</label><textarea name="description" class="form-control"></textarea></div>
            <div class="mb-2"><label>Previsão</label><input type="date" name="deadline" class="form-control" required></div>
            <div class="mb-2"><label>Urgência</label>
                <select name="priority" class="form-select">
                    <option value="baixa">Baixa</option><option value="media">Média</option>
                    <option value="alta">Alta</option><option value="urgente">Urgente</option>
                </select>
            </div>
      </div>
      <div class="modal-footer"><button type="submit" class="btn btn-primary w-100">Criar no Backlog</button></div>
    </form>
  </div>
</div>

<script>
    const FLOW_ORDER = ['backlog', 'sprint_backlog', 'andamento', 'concluido'];

    function canMoveForward(fromColumn, toColumn) {
        const fromIndex = FLOW_ORDER.indexOf(fromColumn);
        const toIndex = FLOW_ORDER.indexOf(toColumn);
        if (fromIndex === -1 || toIndex === -1) return false;
        return toIndex > fromIndex;
    }

    function restoreCardPosition(evt) {
        const referenceNode = evt.from.children[evt.oldIndex];
        if (referenceNode) {
            evt.from.insertBefore(evt.item, referenceNode);
        } else {
            evt.from.appendChild(evt.item);
        }
    }

    function openModal(columnId) {
        document.getElementById('modal_column').value = columnId;
        new bootstrap.Modal(document.getElementById('taskModal')).show();
    }

    function openEditModal(button) {
        document.getElementById('edit_id').value = button.getAttribute('data-id');
        document.getElementById('edit_description').value = button.getAttribute('data-description') || '';
        document.getElementById('edit_deadline').value = button.getAttribute('data-deadline') || '';
        document.getElementById('edit_priority').value = button.getAttribute('data-priority') || 'baixa';
        new bootstrap.Modal(document.getElementById('editTaskModal')).show();
    }

    function toggleAnalytics() {
        const area = document.getElementById('analyticsArea');
        area.style.display = area.style.display === 'none' ? 'block' : 'none';
        if(area.style.display === 'block') renderCharts();
    }

    // Lógica de Arrastar e Salvar
    document.querySelectorAll('.task-list').forEach(el => {
        new Sortable(el, {
            group: 'kanban',
            animation: 150,
            onEnd: function (evt) {
                const taskId = evt.item.getAttribute('data-id');
                const oldColumn = evt.from.getAttribute('data-column');
                const newColumn = evt.to.getAttribute('data-column');

                if (oldColumn === newColumn) {
                    return;
                }

                if (!canMoveForward(oldColumn, newColumn)) {
                    restoreCardPosition(evt);
                    alert('Movimento inválido: o card só pode avançar no fluxo e nunca voltar.');
                    return;
                }
                
                fetch('/move', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ id: taskId, new_column: newColumn })
                })
                .then(res => res.json())
                .then(data => {
                    if (data.success) {
                        window.location.reload();
                    } else {
                        restoreCardPosition(evt);
                        alert(data.message || 'Não foi possível mover o card.');
                    }
                })
                .catch(() => {
                    restoreCardPosition(evt);
                    alert('Erro ao salvar movimento. Tente novamente.');
                });
            }
        });
    });

    // --- GRÁFICOS ---
    function renderCharts() {
        fetch('/analytics-data').then(res => res.json()).then(data => {
            // Gráfico de Tempo Médio
            new Chart(document.getElementById('timeChart'), {
                type: 'bar',
                data: {
                    labels: ['Backlog -> Sprint', 'Sprint -> Execução', 'Execução -> Fim'],
                    datasets: [{
                        label: 'Média de Dias',
                        data: [data.avg_sprint, data.avg_exec, data.avg_done],
                        backgroundColor: ['#dfe1e6', '#ff9f1a', '#61bd4f']
                    }]
                }
            });

            // Gráfico de Prioridades
            new Chart(document.getElementById('priorityChart'), {
                type: 'doughnut',
                data: {
                    labels: ['Baixa', 'Média', 'Alta', 'Urgente'],
                    datasets: [{
                        data: [data.prio.baixa, data.prio.media, data.prio.alta, data.prio.urgente],
                        backgroundColor: ['#61bd4f', '#f2d600', '#ff9f1a', '#eb5a46']
                    }]
                }
            });
        });
    }
</script>
<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
</body>
</html>
"""

# --- ROTAS FLASK ---

@app.route('/')
def index():
    data = load_data()
    columns = {
        "backlog": "Backlog",
        "sprint_backlog": "Sprint Backlog",
        "andamento": "Em Andamento",
        "concluido": "Concluído"
    }
    return render_template_string(PAGE_HTML, tasks=data['tasks'], columns=columns)

@app.route('/add', methods=['POST'])
def add_task():
    data = load_data()
    now = datetime.now().strftime("%d/%m/%Y %H:%M")
    
    new_task = {
        "id": str(uuid.uuid4()),
        "title": request.form.get('title'),
        "description": request.form.get('description'),
        "column": request.form.get('column'),
        "priority": request.form.get('priority'),
        "deadline": request.form.get('deadline'),
        "timestamps": {
            "backlog": now,
            "sprint_backlog": None,
            "andamento": None,
            "concluido": None
        }
    }
    
    # Se adicionar direto em outra coluna, marca o tempo dela também
    if new_task["column"] != "backlog":
        new_task["timestamps"][new_task["column"]] = now

    data['tasks'].append(new_task)
    save_data(data)
    return """<script>window.location.href='/';</script>"""


@app.route('/edit', methods=['POST'])
def edit_task():
    data = load_data()
    task_id = request.form.get('id')

    for task in data['tasks']:
        if task['id'] == task_id:
            task['description'] = request.form.get('description', '')
            task['deadline'] = request.form.get('deadline')
            task['priority'] = request.form.get('priority')
            save_data(data)
            break

    return """<script>window.location.href='/';</script>"""

@app.route('/move', methods=['POST'])
def move_task():
    req = request.json
    data = load_data()
    now = datetime.now().strftime("%d/%m/%Y %H:%M")
    new_col = req.get('new_column')

    if new_col not in FLOW_ORDER:
        return jsonify(success=False, message='Coluna de destino inválida.')

    for task in data['tasks']:
        if task['id'] == req.get('id'):
            current_col = task.get('column')
            if current_col not in FLOW_ORDER:
                return jsonify(success=False, message='Coluna atual inválida.')

            if FLOW_ORDER.index(new_col) <= FLOW_ORDER.index(current_col):
                return jsonify(success=False, message='Movimento inválido: só é permitido avançar no fluxo.')

            task['column'] = new_col
            # Grava o timestamp da coluna APENAS se ela ainda estiver vazia (primeira entrada)
            if not task['timestamps'].get(new_col):
                task['timestamps'][new_col] = now
            save_data(data)
            return jsonify(success=True)
    return jsonify(success=False)

@app.route('/analytics-data')
def analytics_data():
    data = load_data()
    tasks = data['tasks']
    
    # Inicializa contadores
    prio_counts = {"baixa": 0, "media": 0, "alta": 0, "urgente": 0}
    
    # Para cálculo de médias (em dias fictícios/horas para o exemplo)
    # Aqui vamos calcular a diferença entre os timestamps
    diffs_sprint = []
    diffs_exec = []
    diffs_done = []

    fmt = "%d/%m/%Y %H:%M"

    for t in tasks:
        prio_counts[t['priority']] += 1
        
        ts = t['timestamps']
        try:
            t_backlog = datetime.strptime(ts['backlog'], fmt)
            
            if ts['sprint_backlog']:
                t_sprint = datetime.strptime(ts['sprint_backlog'], fmt)
                diffs_sprint.append((t_sprint - t_backlog).total_seconds() / 3600) # horas

            if ts['sprint_backlog'] and ts['andamento']:
                t_sprint = datetime.strptime(ts['sprint_backlog'], fmt)
                t_and = datetime.strptime(ts['andamento'], fmt)
                diffs_exec.append((t_and - t_sprint).total_seconds() / 3600)

            if ts['andamento'] and ts['concluido']:
                t_and = datetime.strptime(ts['andamento'], fmt)
                t_done = datetime.strptime(ts['concluido'], fmt)
                diffs_done.append((t_done - t_and).total_seconds() / 3600)
        except:
            continue

    def avg(lst): return round(sum(lst) / len(lst), 2) if lst else 0

    return jsonify({
        "prio": prio_counts,
        "avg_sprint": avg(diffs_sprint),
        "avg_exec": avg(diffs_exec),
        "avg_done": avg(diffs_done)
    })

if __name__ == '__main__':
    app.run(debug=True, port=5000)
