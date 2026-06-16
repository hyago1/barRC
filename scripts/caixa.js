    async function verificarAutenticacao() {
      const { data: { session } } = await supabaseClient.auth.getSession();
      if (!session) {
        window.location.href = './login.html';
      }
    }

    verificarAutenticacao();

const pedidoAtual = { carne: 0, queijo: 0, frango: 0, lingua: 0, calabresa: 0, camarao: 0 };
    const estoqueAtual = { carne: 0, queijo: 0, frango: 0, lingua: 0, calabresa: 0, camarao: 0 };
    
    // Variáveis para guardar os dados do último pedido e permitir estorno
    let ultimoPedidoId = null;
    let ultimoPedidoItens = {};

    async function carregarEstoque() {
      const { data } = await supabaseClient.from('estoque').select('*');
      if (data) {
        data.forEach(reg => {
          estoqueAtual[reg.item] = reg.quantidade_disponivel;
          atualizarContadorVisualEstoque(reg.item);
        });
      }
    }

    function atualizarContadorVisualEstoque(item) {
      const elemento = document.getElementById(`disponivel-${item}`);
      if (elemento) elemento.innerText = `(Disponível: ${estoqueAtual[item]})`;

      const inputManual = document.getElementById(`input-est-${item}`);
      if (inputManual) inputManual.value = estoqueAtual[item];
    }

    supabaseClient
      .channel('mudanca-estoque')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'estoque' }, payload => {
        const reg = payload.new;
        estoqueAtual[reg.item] = reg.quantidade_disponivel;
        atualizarContadorVisualEstoque(reg.item);
      })
      .subscribe();

    function alterarQuantidade(item, valor) {
      const novaQtd = pedidoAtual[item] + valor;

      if (valor > 0 && novaQtd > estoqueAtual[item]) {
        alert(`Estoque insuficiente! Só restam ${estoqueAtual[item]} unidades.`);
        return;
      }

      if (novaQtd >= 0) {
        pedidoAtual[item] = novaQtd;
        document.getElementById(`qtd-${item}`).innerText = novaQtd;
      }
    }

    function limparContadores() {
      for (const item in pedidoAtual) {
        pedidoAtual[item] = 0;
        document.getElementById(`qtd-${item}`).innerText = 0;
      }
    }

    function togglePainelEstoque() {
      const gaveta = document.getElementById('gaveta-estoque');
      gaveta.classList.toggle('translate-x-full');
    }

    async function salvarEstoqueManual() {
      const itens = ['carne', 'queijo', 'frango', 'lingua', 'calabresa', 'camarao'];
      for (const item of itens) {
        const novoValor = parseInt(document.getElementById(`input-est-${item}`).value) || 0;
        await supabaseClient.from('estoque').update({ quantidade_disponivel: novoValor }).eq('item', item);
      }
      alert('Estoque atualizado!');
      togglePainelEstoque();
    }

    // FINALIZAR PEDIDO
    document.getElementById('btn-finalizar').addEventListener('click', async () => {
      const itensFormatados = [];
      const deparaNomes = { carne: 'Carne', queijo: 'Queijo', frango: 'Frango', lingua: 'Língua', calabresa: 'Calabresa', camarao: 'Camarão' };
      
      // Limpa os dados do último pedido gravado na memória
      ultimoPedidoItens = {};

      for (const item in pedidoAtual) {
        if (pedidoAtual[item] > 0) {
          itensFormatados.push(`${pedidoAtual[item]}x ${deparaNomes[item]}`);
          // Guarda o que foi pedido para caso precise cancelar depois
          ultimoPedidoItens[item] = pedidoAtual[item]; 
        }
      }

      if (itensFormatados.length === 0) return alert('Selecione pelo menos 1 item!');
      const itensTextoFinal = itensFormatados.join(', ');

      // Abate do estoque no banco
      for (const item in pedidoAtual) {
        if (pedidoAtual[item] > 0) {
          const novaQtdBanco = estoqueAtual[item] - pedidoAtual[item];
          await supabaseClient.from('estoque').update({ quantidade_disponivel: novaQtdBanco }).eq('item', item);
        }
      }

      // Criação do pedido
      const { data, error } = await supabaseClient
        .from('pedidos')
        .insert([{ itens: itensTextoFinal, status: 'pendente' }])
        .select()
        .single();

      if (error) return alert('Erro ao salvar: ' + error.message);

      // Guarda a ID do pedido recém criado
      ultimoPedidoId = data.id;

      const urlCliente = `https://bar-rc.vercel.app/cliente.html?id=${data.id}`;
      const qrCodeUrl = `https://quickchart.io/qr?text=${encodeURIComponent(urlCliente)}&size=200&margin=1`;

      document.getElementById('txt-senha').innerText = data.senha;
      document.getElementById('img-qrcode').src = qrCodeUrl;
      document.getElementById('placeholder-caixa').classList.add('hidden');
      document.getElementById('resultado-pedido').classList.remove('hidden');

      limparContadores();
    });

    // CANCELAR PEDIDO
    document.getElementById('btn-cancelar').addEventListener('click', async () => {
      if (!ultimoPedidoId) return;

      const confirmacao = confirm('Tem certeza que deseja cancelar o último pedido e estornar o estoque?');
      if (!confirmacao) return;

      // 1. Deleta o pedido do banco
      const { error } = await supabaseClient.from('pedidos').delete().eq('id', ultimoPedidoId);
      if (error) return alert('Erro ao cancelar: ' + error.message);

      // 2. Devolve o estoque de volta para o banco
      for (const item in ultimoPedidoItens) {
        const novaQtdBanco = estoqueAtual[item] + ultimoPedidoItens[item];
        await supabaseClient.from('estoque').update({ quantidade_disponivel: novaQtdBanco }).eq('item', item);
      }

      // 3. Reseta a tela
      document.getElementById('resultado-pedido').classList.add('hidden');
      document.getElementById('placeholder-caixa').classList.remove('hidden');
      
      // Limpa a memória para não cancelar o mesmo pedido duas vezes
      ultimoPedidoId = null;
      ultimoPedidoItens = {};

      alert('Pedido cancelado com sucesso e estoque devolvido!');
    });

    carregarEstoque();