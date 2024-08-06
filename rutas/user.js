const express = require('express');
const router = express.Router();
const pool = require('../config/db');

// Ruta para listar bases de datos
router.get('/bases-de-datos', async (req, res) => {
  try {
    const [rows] = await pool.query('SHOW DATABASES');
    res.render('listadb', { databases: rows });
  } catch (err) {
    console.error('Error al obtener la lista de bases de datos:', err);
    res.status(500).send('Error al obtener la lista de bases de datos');
  }
});

router.get('/',(req, res)=>{
  res.render('inicio');
});

// Ruta para ver el contenido de una base de datos
router.get('/ver-db', async (req, res) => {
  const { dbName } = req.query;
  try {
    const [tables] = await pool.query(`SHOW TABLES FROM ??`, [dbName]);
    res.render('verdb', { dbName, tables });
  } catch (err) {
    console.error(`Error al obtener las tablas de la base de datos ${dbName}:`, err);
    res.status(500).send(`Error al obtener las tablas de la base de datos ${dbName}`);
  }
});

// Ruta para borrar una base de datos
router.post('/borrar-db', async (req, res) => {
  const { dbName } = req.body;
  try {
    await pool.query(`DROP DATABASE ??`, [dbName]);
    res.redirect('/bases-de-datos');
  } catch (err) {
    console.error(`Error al borrar la base de datos ${dbName}:`, err);
    res.status(500).send(`Error al borrar la base de datos ${dbName}`);
  }
});

// Ruta para crear una nueva base de datos
router.post('/crear-db', async (req, res) => {
  const { dbName } = req.body;
  try {
    await pool.query(`CREATE DATABASE ??`, [dbName]);
    res.redirect('/bases-de-datos');
  } catch (err) {
    console.error(`Error al crear la base de datos ${dbName}:`, err);
    res.status(500).send(`Error al crear la base de datos ${dbName}`);
  }
});

// Ruta para crear una tabla en una base de datos
router.post('/crear-tabla', async (req, res) => {
  const { dbName, tableName, campos } = req.body;

  let query = `CREATE TABLE ${dbName}.${tableName} (`;
  campos.forEach((campo, index) => {
    query += `${campo.nombre} ${campo.tipo}`;
    if (campo.llave) query += ' PRIMARY KEY';
    if (index < campos.length - 1) query += ', ';
  });
  query += ')';

  try {
    await pool.query(query);
    res.redirect(`/ver-db?dbName=${dbName}`);
  } catch (err) {
    console.error(`Error al crear la tabla ${tableName} en la base de datos ${dbName}:`, err);
    res.status(500).send(`Error al crear la tabla ${tableName} en la base de datos ${dbName}`);
  }
});

// Ruta para mostrar el formulario de creación de tablas
router.get('/agregar-tabla', (req, res) => {
  const { dbName } = req.query;
  res.render('agregartabla', { dbName });
});

// Ruta para mostrar el formulario de agregar datos
router.get('/agregar-datos', async (req, res) => {
  const { dbName, tableName } = req.query;
  try {
    const [columns] = await pool.query(`SHOW COLUMNS FROM ${dbName}.${tableName}`);
    const columnNames = columns.map(column => column.Field);
    res.render('agregarDatos', { dbName, tableName, columns: columnNames });
  } catch (err) {
    console.error(`Error al obtener las columnas de la tabla ${tableName} en la base de datos ${dbName}:`, err);
    res.status(500).send(`Error al obtener las columnas de la tabla ${tableName} en la base de datos ${dbName}`);
  }
});

//ruta para insertar en tabla nuevo registro
router.post('/agregar-datos', async (req, res) => {
  const { dbName, tableName, data } = req.body;

  if (!data) {
    return res.status(400).send('No se proporcionaron datos.');
  }

  const columns = Object.keys(data).join(',');
  const values = Object.values(data).map(value => `'${value}'`).join(',');

  try {
    await pool.query(`INSERT INTO ${dbName}.${tableName} (${columns}) VALUES (${values})`);
    res.redirect(`/ver-tabla?dbName=${dbName}&tableName=${tableName}`);
  } catch (err) {
    console.error(`Error al agregar datos a la tabla ${tableName} en la base de datos ${dbName}:`, err);
    res.status(500).send(`Error al agregar datos a la tabla ${tableName} en la base de datos ${dbName}`);
  }
});

// Ruta para ver el contenido de una tabla en una base de datos
router.get('/ver-tabla', async (req, res) => {
  const { dbName, tableName } = req.query;
  try {
    const [rows] = await pool.query(`SELECT * FROM ${dbName}.${tableName}`);
    res.render('vertabla', { dbName, tableName, rows });
  } catch (err) {
    console.error(`Error al obtener el contenido de la tabla ${tableName} en la base de datos ${dbName}:`, err);
    res.status(500).send(`Error al obtener el contenido de la tabla ${tableName} en la base de datos ${dbName}`);
  }
});

// Ruta para borrar una tabla
router.post('/borrar-tabla', async (req, res) => {
  const { dbName, tableName } = req.body;

  try {
    await pool.query(`DROP TABLE ${dbName}.${tableName}`);
    res.redirect(`/ver-db?dbName=${dbName}`);
  } catch (err) {
    console.error(`Error al borrar la tabla ${tableName} en la base de datos ${dbName}:`, err);
    res.status(500).send(`Error al borrar la tabla ${tableName} en la base de datos ${dbName}`);
  }
});

// Ruta para mostrar el formulario de edición
router.get('/editar-registro', async (req, res) => {
  const { dbName, tableName, id } = req.query;

  try {
    // Obtener los detalles del registro a editar
    const [rows] = await pool.query(`SELECT * FROM ${dbName}.${tableName} WHERE id = ?`, [id]);
    const record = rows[0];

    if (!record) {
      return res.status(404).send('Registro no encontrado');
    }

    // Renderizar el formulario de edición
    res.render('editarregistro', { dbName, tableName, record });
  } catch (err) {
    console.error('Error al obtener el registro para editar:', err);
    res.status(500).send('Error al obtener el registro para editar');
  }
});

// Ruta para actualizar el registro
router.post('/actualizar-registro', async (req, res) => {
  const { dbName, tableName, id, ...fields } = req.body;

  // Generar la consulta de actualización
  const setClause = Object.keys(fields).map(field => `${field} = ?`).join(', ');
  const values = Object.values(fields);

  try {
    await pool.query(`UPDATE ${dbName}.${tableName} SET ${setClause} WHERE id = ?`, [...values, id]);
    res.redirect(`/ver-tabla?dbName=${dbName}&tableName=${tableName}`);
  } catch (err) {
    console.error('Error al actualizar el registro:', err);
    res.status(500).send('Error al actualizar el registro');
  }
});

// Ruta para eliminar un registro
router.post('/eliminar-registro', async (req, res) => {
  const { dbName, tableName, id } = req.body;

  try {
    await pool.query(`DELETE FROM ${dbName}.${tableName} WHERE id = ?`, [id]);
    res.redirect(`/ver-tabla?dbName=${dbName}&tableName=${tableName}`);
  } catch (err) {
    console.error('Error al eliminar el registro:', err);
    res.status(500).send('Error al eliminar el registro');
  }
});

// Ruta para mostrar el formulario de modificación de una tabla
router.get('/modificar-tabla', async (req, res) => {
  const { dbName, tableName } = req.query;

  try {
    const [columns] = await pool.query(`SHOW COLUMNS FROM ${dbName}.${tableName}`);
    res.render('modificarTabla', { dbName, tableName, columns });
  } catch (err) {
    console.error('Error al obtener las columnas de la tabla:', err);
    res.status(500).send('Error al obtener las columnas de la tabla');
  }
});

// Ruta para agregar un campo a una tabla
router.post('/agregar-campo', async (req, res) => {
  const { dbName, tableName, campoNombre, campoTipo } = req.body;

  try {
    await pool.query(`ALTER TABLE ${dbName}.${tableName} ADD COLUMN ${campoNombre} ${campoTipo}`);
    res.redirect(`/modificar-tabla?dbName=${dbName}&tableName=${tableName}`);
  } catch (err) {
    console.error('Error al agregar el campo:', err);
    res.status(500).send('Error al agregar el campo');
  }
});

// Ruta para eliminar un campo de una tabla
router.post('/borrar-campo', async (req, res) => {
  const { dbName, tableName, campoNombre } = req.body;

  try {
    // Verificar si el campo es una clave primaria
    const [columns] = await pool.query(`SHOW COLUMNS FROM ${dbName}.${tableName}`);
    const column = columns.find(col => col.Field === campoNombre);

    if (column.Key === 'PRI') {
      return res.status(400).send('No se puede eliminar un campo que es clave primaria.');
    }

    await pool.query(`ALTER TABLE ${dbName}.${tableName} DROP COLUMN ${campoNombre}`);
    res.redirect(`/modificar-tabla?dbName=${dbName}&tableName=${tableName}`);
  } catch (err) {
    console.error('Error al borrar el campo:', err);
    res.status(500).send('Error al borrar el campo');
  }
});



module.exports = router;
