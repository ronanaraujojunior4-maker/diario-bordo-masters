/* Configuração do Supabase do Diário de Bordo.
   Deixe vazio para o modo demonstração. Preencha SOMENTE com a Project URL e a chave publishable/anon
   (Settings → API). NUNCA coloque aqui a chave service_role nem a senha do banco. */
window.DIARIO_CONFIG = {
  supabaseUrl: 'https://qiejqnqatvjwhaoeehev.supabase.co',
  supabaseAnonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFpZWpxbnFhdHZqd2hhb2VlaGV2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTU2MTM1OTcsImV4cCI6MjExMTE4OTU5N30.DE7-sbDK9LKlUWMwKvYY16vXJPtu7J8imNrTG4d06_I', // chave pública (role anon)
  loginDomain: 'diario.masters', // usuário RONAN entra como ronan@diario.masters
};
