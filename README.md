## clonar el repositorio
git clone https://github.com/pederseo-dev/hackatoon

## isntalador de pear
npm i -g pear

## crea un proyecto pear (para crear nuevo proyecto)
pear init --yes

## crea paquete para instalar dependencias
npm install

## corre el proyecto
pear run --dev .

## instalar dependencias
npm install hyperswarm hypercore-crypto b4a
npm install hyperbee hypercore


1. modificar el textarea para que los mensajes se vayan agregando en la cola
en la funcion que muestra los mensajes nuevos tendria que sumar el nuevo mensaje a la cola y borrar el textarea para mostrar la historia hasta donde se llego
2. 