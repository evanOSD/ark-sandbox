const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhvaXVvZ3phdWx2a2F2cmFrdmVhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIxMzI3MTIsImV4cCI6MjA5NzcwODcxMn0.P4C-PbZHGCRWaWsKb0vvHxIL9svpj_6EMXzNaWAcO4Y';
const url = 'https://hoiuogzaulvkavrakvea.supabase.co/rest/v1/';

async function run() {
  try {
    const res = await fetch(url, {
      headers: {
        'apikey': anonKey,
        'Authorization': `Bearer ${anonKey}`
      }
    });
    const schema = await res.json();
    console.log("SCHEMA:", schema);
  } catch (err) {
    console.error(err);
  }
}

run();
