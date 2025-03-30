/** @typedef {import('pear-interface')} */ 
import fs from 'fs';
import Hyperswarm from 'hyperswarm';
import crypto from 'hypercore-crypto';
import b4a from 'b4a';
import Hypercore from 'hypercore';
import Hyperbee from 'hyperbee';

const { teardown, updates } = Pear;
const swarm = new Hyperswarm();

// Base de datos Hyperbee sobre un Hypercore
const core = new Hypercore('./chat-data');
const db = new Hyperbee(core, { keyEncoding: 'utf-8', valueEncoding: 'json' });

async function setupDB() {
  await db.ready();
}
setupDB();

// Destruir Hyperswarm al salir
teardown(() => swarm.destroy());

swarm.on('connection', async (peer) => {
  const name = b4a.toString(peer.remotePublicKey, 'hex').substr(0, 6);
  console.log(`Nuevo nodo conectado: ${name}`);

  peer.on('data', (data) => {
    try {
      const message = JSON.parse(data.toString());
      onMessageAdded(message.from, message.text);
    } catch (error) {
      console.error('Error procesando mensaje:', error);
    }
  });

  peer.on('error', (e) => console.log(`Error de conexión: ${e}`));

  // Enviar historial de mensajes al nuevo nodo solo una vez
  await sendHistoryToPeer(peer);
});

// Mostrar cantidad de peers conectados
swarm.on('update', () => {
  document.querySelector('#peers-count').textContent = swarm.connections.size;
});

// Eventos de UI
document.querySelector('#create-chat-room').addEventListener('click', createChatRoom);
document.querySelector('#join-form').addEventListener('submit', joinChatRoom);
document.querySelector('#message-form').addEventListener('submit', sendMessage);

// Crear sala de chat
async function createChatRoom() {
  const topicBuffer = crypto.randomBytes(32);
  joinSwarm(topicBuffer);
}

// Unirse a una sala de chat
async function joinChatRoom(e) {
  e.preventDefault();
  const topicStr = document.querySelector('#join-chat-room-topic').value;
  const topicBuffer = b4a.from(topicStr, 'hex');
  joinSwarm(topicBuffer);
}

// Unirse a un canal en Hyperswarm
async function joinSwarm(topicBuffer) {
  document.querySelector('#setup').classList.add('hidden');
  document.querySelector('#loading').classList.remove('hidden');

  const discovery = swarm.join(topicBuffer, { client: true, server: true });
  await discovery.flushed();

  const topic = b4a.toString(topicBuffer, 'hex');
  document.querySelector('#chat-room-topic').innerText = topic;
  document.querySelector('#loading').classList.add('hidden');
  document.querySelector('#chat').classList.remove('hidden');
}

// Enviar mensaje
async function sendMessage(e) {
  e.preventDefault();
  const messageText = document.querySelector('#message').value.trim();
  document.querySelector('#message').value = '';

  if (!messageText) return;

  const message = { from: 'You', text: messageText };

  onMessageAdded(message.from, message.text);

  const peers = [...swarm.connections];
  for (const peer of peers) {
    peer.write(JSON.stringify(message));
  }

  await saveMessageToDB(message.from, message.text);
}

// Agregar mensaje y guardarlo en Hyperbee
async function onMessageAdded(from, message) {
  const messagesContainer = document.querySelector('#messages');

  if (Buffer.isBuffer(message)) {
    message = message.toString();
  }

  messagesContainer.textContent += ` ${message}`;

  await saveMessageToDB(from, message);
}

// Guardar mensaje en Hyperbee
async function saveMessageToDB(from, message) {
  const timestamp = new Date().toISOString();
  await db.put(timestamp, { from, text: message });
}

// Cargar mensajes previos desde Hyperbee solo cuando se une el nodo
async function loadMessagesFromDB() {
  console.log('Cargando historial de mensajes...');
  const messagesContainer = document.querySelector('#messages');

  for await (const { value } of db.createReadStream()) {
    messagesContainer.textContent += `\n${value.from}: ${value.text}`;
  }
}

// Enviar historial de mensajes a un nuevo nodo
async function sendHistoryToPeer(peer) {
  // Enviar solo una vez al nuevo nodo los mensajes guardados
  for await (const { value } of db.createReadStream()) {
    peer.write(JSON.stringify(value));
  }
}






// import fs from 'fs';

// const guardarDatos = (datos, archivo) => {
//   fs.writeFileSync(archivo, JSON.stringify(datos, null, 2), 'utf-8');
//   console.log('Datos guardados correctamente');
// };

// export { guardarDatos };



// const extraerDatos = (archivo) => {
//   try {
//     const datos = fs.readFileSync(archivo, 'utf-8');
//     return JSON.parse(datos);
//   } catch (error) {
//     console.error('Error al leer el archivo:', error);
//     return null;
//   }
// };

// export { extraerDatos };



// import { guardarDatos, extraerDatos } from './archivo';

// const datos = { nombre: 'Juan', edad: 30 };

// // Guardar datos
// guardarDatos(datos, 'data.json');

// // Leer datos
// const datosLeidos = extraerDatos('data.json');
// console.log(datosLeidos);
