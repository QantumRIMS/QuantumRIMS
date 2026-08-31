import fetch from 'node-fetch';

async function test() {
  const res = await fetch('http://localhost:3001/api/chat/admin', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: "List faculty with PHD" })
  });
  const data = await res.json();
  console.log(data);
}

test();
