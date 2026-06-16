
async function verificarAutenticacao() {
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (!session) {
        window.location.href = './cozinha.html';
    }
}

verificarAutenticacao();

// Carrega os pedidos iniciais que não estão prontos nem entregues
async function carregarFila() {
    const { data, error } = await supabaseClient
        .from('pedidos')
        .select('*')
        .in('status', ['pendente', 'preparando'])
        .order('senha', { ascending: true });

    if (data) {
        document.getElementById('container-pedidos').innerHTML = '';
        data.forEach(pedido => renderizarCard(pedido));
    }
}

// Renderiza o card do pedido na tela com estilo Copa do Mundo
function renderizarCard(pedido) {
    const container = document.getElementById('container-pedidos');
    const card = document.createElement('div');
    card.id = `card-${pedido.id}`;
    card.className = "bg-slate-800 rounded-xl overflow-hidden border-2 border-yellow-500 shadow-xl flex flex-col justify-between";

    card.innerHTML = `
        <div class="bg-yellow-500 p-3 flex justify-between items-center text-slate-900 font-black">
          <span class="text-2xl">#${pedido.senha}</span>
          <span class="text-xs uppercase bg-slate-900 text-white px-2 py-0.5 rounded">${pedido.status}</span>
        </div>
        <div class="p-4 flex-grow">
          <p class="text-xl font-bold whitespace-pre-wrap text-green-300">${pedido.itens}</p>
        </div>
        <div class="p-3 bg-slate-800/50 border-t border-slate-700">
          <button onclick="marcarComoPronto('${pedido.id}')" class="w-full bg-green-600 hover:bg-green-500 text-white font-black py-3 rounded-lg uppercase tracking-wider text-sm transition-colors border-b-4 border-green-800">
            ✅ Pronto para Retirada
          </button>
        </div>
      `;
    container.appendChild(card);
}

// Altera o status para 'pronto' no Supabase
async function marcarComoPronto(id) {
    const { error } = await supabaseClient
        .from('pedidos')
        .update({ status: 'pronto' })
        .eq('id', id);

    if (!error) {
        document.getElementById(`card-${id}`).remove();
    }
}

// Escuta em tempo real se novos pedidos entram pela tela do caixa
// Escuta em tempo real entradas E saídas de pedidos
supabaseClient
    .channel('fila-cozinha')
    // Escuta novos pedidos (INSERT)
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'pedidos' }, payload => {
        renderizarCard(payload.new, true);
    })
    // Escuta pedidos cancelados/deletados (DELETE)
    .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'pedidos' }, payload => {
        const cardCancelado = document.getElementById(`card-${payload.old.id}`);
        if (cardCancelado) {
            cardCancelado.remove(); // Fica invisível e some da tela na mesma hora
        }
    })
    .subscribe();

// Executa ao carregar a página
carregarFila();