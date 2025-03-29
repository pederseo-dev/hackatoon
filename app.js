// Para la documentación interactiva y la autocompletación de código en el editor
/** @typedef {import('pear-interface')} */ 

/* global Pear */
import Hyperswarm from 'hyperswarm'   // Módulo para redes P2P y conectar pares
import crypto from 'hypercore-crypto' // Funciones criptográficas para generar la clave en la app
import b4a from 'b4a'                 // Módulo para conversiones entre buffer y string
const { teardown, updates } = Pear    // Funciones para limpieza y actualizaciones

const swarm = new Hyperswarm()

// Anunciar la clave pública antes de salir del proceso
// (Esto no es obligatorio, pero ayuda a evitar la contaminación de la DHT)
teardown(() => swarm.destroy())

// Habilitar recarga automática para la aplicación
// Esto es opcional, pero útil durante la producción
updates(() => Pear.reload())

// Cuando haya una nueva conexión, escuchar los nuevos mensajes y añadirlos a la interfaz de usuario
swarm.on('connection', (peer) => {
  // Asignar un nombre a los pares entrantes usando los primeros 6 caracteres de su clave pública en formato hexadecimal
  const name = b4a.toString(peer.remotePublicKey, 'hex').substr(0, 6)
  peer.on('data', message => onMessageAdded(name, message))
  peer.on('error', e => console.log(`Error de conexión: ${e}`))
})

// Cuando haya actualizaciones en el swarm, actualizar el número de pares
swarm.on('update', () => {
  document.querySelector('#peers-count').textContent = swarm.connections.size
})

document.querySelector('#create-chat-room').addEventListener('click', createChatRoom)
document.querySelector('#join-form').addEventListener('submit', joinChatRoom)
document.querySelector('#message-form').addEventListener('submit', sendMessage)

async function createChatRoom() {
  // Generar un nuevo tema aleatorio (cadena de 32 bytes)
  const topicBuffer = crypto.randomBytes(32)
  joinSwarm(topicBuffer)
}

async function joinChatRoom (e) {
  e.preventDefault()
  const topicStr = document.querySelector('#join-chat-room-topic').value
  const topicBuffer = b4a.from(topicStr, 'hex')
  joinSwarm(topicBuffer)
}

async function joinSwarm (topicBuffer) {
  document.querySelector('#setup').classList.add('hidden')
  document.querySelector('#loading').classList.remove('hidden')

  // Unirse al swarm con el tema. Configurar tanto cliente/servidor como verdadero significa que esta aplicación puede actuar como ambas.
  const discovery = swarm.join(topicBuffer, { client: true, server: true })
  await discovery.flushed()

  const topic = b4a.toString(topicBuffer, 'hex')
  document.querySelector('#chat-room-topic').innerText = topic
  document.querySelector('#loading').classList.add('hidden')
  document.querySelector('#chat').classList.remove('hidden')
}

function sendMessage (e) {
  const message = document.querySelector('#message').value
  document.querySelector('#message').value = ''
  e.preventDefault()

  onMessageAdded('You', message)

  // Enviar el mensaje a todos los pares (con los que estás conectado)
  const peers = [...swarm.connections]
  for (const peer of peers) peer.write(message)
}

// Añadir un elemento al contenedor #messages con el contenido configurado al remitente y mensaje
function onMessageAdded (from, message) {
  const $div = document.createElement('div')
  $div.textContent = `<${from}> ${message}`
  document.querySelector('#messages').appendChild($div)
}
