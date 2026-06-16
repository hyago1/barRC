// Dentro do seu arquivo ./supabase.js

const URL_DO_BANCO = 'https://gtmbjunwwgwibzrwumfh.supabase.co';
const CHAVE_DO_BANCO = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd0bWJqdW53d2d3aWJ6cnd1bWZoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE0ODA3NDQsImV4cCI6MjA5NzA1Njc0NH0.VQehZvKNsT0TJ-CaB3gb0JUxf01BSi5C1EOYmcPTqEE';

// Aqui usamos a biblioteca global (supabase) para criar o SEU cliente customizado (window.supabaseClient)
window.supabaseClient = supabase.createClient(URL_DO_BANCO, CHAVE_DO_BANCO);



    async function verificarAutenticacao() {
      const { data: { session } } = await supabaseClient.auth.getSession();
      if (!session) {
        window.location.href = './login.html';
      }
    }

    verificarAutenticacao();