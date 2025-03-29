/** @typedef {import('pear-interface')} */ 

/* global Pear */
import Hyperswarm from 'hyperswarm'   // Módulo para redes P2P y conectar pares
import crypto from 'hypercore-crypto' // Funciones criptográficas para generar la clave en la app
import b4a from 'b4a'                 // Módulo para conversiones entre buffer y string
const { teardown, updates } = Pear    // Funciones para limpieza y actualizaciones

const swarm = new Hyperswarm() // Crear una nueva instancia de Hyperswarm para la red P2P

// Anunciar la clave pública antes de salir del proceso
// (Esto no es obligatorio, pero ayuda a evitar la contaminación de la DHT)
teardown(() => swarm.destroy()) // Cuando la aplicación se cierre, destruimos la instancia del swarm

// Habilitar recarga automática para la aplicación
// Esto es opcional, pero útil durante la producción
updates(() => Pear.reload()) // Recargar la aplicación automáticamente cuando haya actualizaciones

// Cuando haya una nueva conexión, escuchar los nuevos mensajes y añadirlos a la interfaz de usuario
swarm.on('connection', (peer) => {
  // Asignar un nombre a los pares entrantes usando los primeros 6 caracteres de su clave pública en formato hexadecimal
  const name = b4a.toString(peer.remotePublicKey, 'hex').substr(0, 6) // Obtener un identificador único para el peer
  peer.on('data', message => onMessageAdded(name, message)) // Cuando el peer envíe un mensaje, agregarlo a la interfaz de usuario
  peer.on('error', e => console.log(`Error de conexión: ${e}`)) // Manejar errores de conexión
})

// Cuando haya actualizaciones en el swarm, actualizar el número de pares
swarm.on('update', () => {
  document.querySelector('#peers-count').textContent = swarm.connections.size // Actualizar el contador de conexiones en la UI
})

// Configurar los eventos de los formularios
document.querySelector('#create-chat-room').addEventListener('click', createChatRoom) // Crear una sala de chat
document.querySelector('#join-form').addEventListener('submit', joinChatRoom) // Unirse a una sala de chat existente
document.querySelector('#message-form').addEventListener('submit', sendMessage) // Enviar un mensaje a la sala de chat

// Función para crear una nueva sala de chat
async function createChatRoom() {
  // Generar un nuevo tema aleatorio (cadena de 32 bytes)
  const topicBuffer = crypto.randomBytes(32) // Genera un buffer aleatorio de 32 bytes
  joinSwarm(topicBuffer) // Unirse a la red P2P usando el tema generado
}

// Función para unirse a una sala de chat existente
async function joinChatRoom (e) {
  e.preventDefault() // Prevenir el comportamiento por defecto del formulario (recargar la página)
  const topicStr = document.querySelector('#join-chat-room-topic').value // Obtener el tema (identificador de la sala)
  const topicBuffer = b4a.from(topicStr, 'hex') // Convertir el tema de hexadecimal a un buffer
  joinSwarm(topicBuffer) // Unirse al swarm con el tema dado
}

// Función para unirse a un swarm utilizando un tema específico
async function joinSwarm (topicBuffer) {
  document.querySelector('#setup').classList.add('hidden') // Ocultar la sección de configuración
  document.querySelector('#loading').classList.remove('hidden') // Mostrar la sección de carga

  // Unirse al swarm con el tema. Configurar tanto cliente/servidor como verdadero significa que esta aplicación puede actuar como ambas.
  const discovery = swarm.join(topicBuffer, { client: true, server: true }) // Unirse al swarm con el tema
  await discovery.flushed() // Esperar a que la unión al swarm esté lista

  const topic = b4a.toString(topicBuffer, 'hex') // Convertir el tema a formato hexadecimal para mostrarlo en la UI
  document.querySelector('#chat-room-topic').innerText = topic // Mostrar el tema de la sala en la UI
  document.querySelector('#loading').classList.add('hidden') // Ocultar la sección de carga
  document.querySelector('#chat').classList.remove('hidden') // Mostrar la sección del chat
}

// Función para enviar un mensaje
function sendMessage (e) {
  const message = document.querySelector('#message').value // Obtener el mensaje del input
  document.querySelector('#message').value = '' // Limpiar el input del mensaje
  e.preventDefault() // Prevenir el comportamiento por defecto del formulario (recargar la página)

  onMessageAdded('You', message) // Mostrar el mensaje en la UI como si lo hubiera enviado el usuario

  // Enviar el mensaje a todos los pares (con los que estás conectado)
  const peers = [...swarm.connections] // Obtener todos los pares con los que estás conectado
  for (const peer of peers) peer.write(message) // Enviar el mensaje a cada uno de los pares
}

// Función para agregar un mensaje a la interfaz de usuario
function onMessageAdded (from, message) {
  const $div = document.createElement('div') // Crear un nuevo elemento div para el mensaje
  $div.textContent = `<${from}> ${message}` // Establecer el contenido del mensaje
  document.querySelector('#messages').appendChild($div) // Agregar el mensaje al contenedor de mensajes
}
