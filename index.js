const express = require('express');
const path = require('path');
const app = express();
const port = 3000;

// Configurar el directorio de vistas y el motor de vistas
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// Middleware para procesar datos de formularios
app.use(express.urlencoded({ extended: true }));

// Donde cargar los archivos estaticos
app.use(express.static(path.join(__dirname, 'web')));

// Importar las rutas
const userRouter = require('./rutas/user');

// Usar las rutas importadas
app.use('/', userRouter);

app.listen(port, () => {
  console.log(`Servidor corriendo en http://localhost:${port}`);
});
