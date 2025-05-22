//1.Importar librerias
const express = require('express')
const oracledb = require('oracledb')
const cors = require('cors');
//2. Vamos a crear nuestra api
const app = express()
const puerto = 3000
const dbConfig = {
    user: 'bd_clavitos',
    password: 'bd_clavitos',
    connectString: 'localhost/XE'
    //connectString: 'localhost/orcl.duoc.com.cl'
}
const API_KEY ='bd_clavitos'
app.use(cors({
  origin: 'http://localhost:8100',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'x-api-key']
}));
function validarApiKey(req, res, next){
    const apiKey = req.headers['x-api-key']
    if(!apiKey || apiKey !== API_KEY){
        return res.status(401).json({error: "API KEY incorrecta o no entregada"})
    }
    next()
}
app.use(express.json())
app.use('/uploads', express.static('uploads'));
const fs = require('fs');          
const path = require('path');  

const multer = require('multer');

const storage = multer.diskStorage({
  destination: 'uploads/',
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  },
});

const upload = multer({ storage });

app.post('/subir-imagen', upload.single('imagen'), (req, res) => {
  console.log('req.file:', req.file);
  if (!req.file) {
    return res.status(400).json({ error: 'No se subió ninguna imagen' });
  }
  const rutaImagen = `http://localhost:${puerto}/uploads/${req.file.filename}`;
  res.json({ imagen: rutaImagen });
});



app.get('/test-conexion', async (req, res) => {
    let cone
    try {
        cone = await oracledb.getConnection(dbConfig)
        await cone.execute('SELECT 1 FROM DUAL')
        res.json({ mensaje: 'Conexión exitosa a la base de datos' })
    } catch (error) {
        res.status(500).json({ mensaje: 'Error de conexión', error: error.message })
    } finally {
        if (cone) await cone.close()
    }
})


//4. Endpoints:
app.get('/',(req,res)=>{
    res.status(200).json({mensaje: "Hola express"})
})

//Obtiene los usuarios
app.get('/usuarios',validarApiKey,async (req,res)=>{
    let cone
    try{
        cone = await oracledb.getConnection(dbConfig)
        const result = await cone.execute(`
        SELECT 
                u.rut_usuario,
                u.nombre,
                u.primer_apellido,
                u.segundo_apellido,
                u.contrasenia,
                u.imagen,
                u.genero,
                u.correo,
                u.direccion,
                u.telefono,
                u.fecha_nacimiento,
                tu.descripcion,
                s.nombre_sucursal,
                c.nombre_comuna
        FROM usuario u
        JOIN tipo_usuario tu ON u.id_tipo_usuario = tu.id_tipo_usuario
        JOIN sucursal s ON u.id_sucursal = s.id_sucursal
        JOIN comuna c ON u.id_comuna = c.id_comuna`)
        res.status(200).json(result.rows.map(row => ({
            rut : row[0],
            nombre : row[1],
            primer_apellido : row[2],
            segundo_apellido : row[3],
            contrasenia: row[4],
            imagen: row[5],
            genero : row[6],
            correo : row[7],
            direccion : row[8],
            telefono : row[9],
            fecha_nacimiento : row[10],
            tipo_usuario : row[11],
            sucursal : row[12],
            comuna : row[13],
        })))
    }catch(ex){
        res.status(500).json({error: ex.message} )
    }finally{
        if (cone) cone.close()
    }
})

app.get('/comuna',validarApiKey,async (req,res)=>{
    let cone
    try{
        cone = await oracledb.getConnection(dbConfig)
        const result = await cone.execute(`
        SELECT
        id_comuna,
        nombre_comuna,
        id_region
        FROM comuna`)
        res.status(200).json(result.rows.map(row => ({
            id_comuna : row[0],
            nombre_comuna : row[1],
            id_region: row[2]
        })))
    }catch(ex){
        res.status(500).json({error: ex.message} )
    }finally{
        if (cone) cone.close()
    }
})
app.get('/sucursal',validarApiKey,async (req,res)=>{
    let cone
    try{
        cone = await oracledb.getConnection(dbConfig)
        const result = await cone.execute(`
        SELECT
        id_sucursal,
        nombre_sucursal,
        direccion,
        telefono,
        id_comuna
        FROM sucursal`)
        res.status(200).json(result.rows.map(row => ({
            id_sucursal : row[0],
            nombre_sucursal : row[1],
            direccion: row[2],
            telefono: row[3],
            id_comuna: row[4]
        })))
    }catch(ex){
        res.status(500).json({error: ex.message} )
    }finally{
        if (cone) cone.close()
    }
})
//Busca usuarios
app.get('/usuarios/:rut',validarApiKey,async (req, res) => {
    let cone
    const rut = req.params.rut; // sin parseInt
    try {
        cone = await oracledb.getConnection(dbConfig)
        const result = await cone.execute(
            'SELECT * FROM usuario WHERE rut_usuario = :rut', [rut]
        )
        if(result.rows.length===0){
            res.status(404).json({mensaje: "Usuario no encontrado"})
        }else{
            const row = result.rows[0]
            res.json({
            rut : row[0],
            nombre : row[1],
            primer_apellido : row[2],
            segundo_apellido : row[3],
            contrasenia: row[4],
            imagen: row[5],
            genero : row[6],
            correo : row[7],
            direccion : row[8],
            telefono : row[9],
            fecha_nacimiento : row[10],
            tipo_usuario : row[11],
            sucursal : row[12],
            comuna : row[13],
            })
        }
    } catch (error) {
        res.status(500).json({error: error.message})
    } finally {
        if (cone) cone.close()
    }
})

app.post('/usuarios',validarApiKey, async (req, res) => {
    let cone
    const {rut, nombre, primer_apellido,segundo_apellido,contrasenia,imagen,genero,correo,direccion,telefono,fecha_nacimiento,tipo_usuario,sucursal,comuna} = req.body
    try {
        cone = await oracledb.getConnection(dbConfig)
        await cone.execute(
            `INSERT INTO usuario
             VALUES(:rut, :nombre,:primer_apellido,:segundo_apellido,:contrasenia,:imagen,:genero,:correo,:direccion,:telefono,TO_DATE(:fecha_nacimiento, 'YYYY-MM-DD'),:tipo_usuario,:sucursal,:comuna)`
            ,{rut, nombre,primer_apellido,segundo_apellido,contrasenia,imagen,genero,correo,direccion,telefono,fecha_nacimiento,tipo_usuario,sucursal,comuna}
            ,{autoCommit: true}
        )
        res.status(201).json({mensaje: "Usuario creado"})
    } catch (error) {
        res.status(500).json({error: error.message})
    } finally {
        if (cone) cone.close()
    }
})


app.put('/usuarios/:rut', validarApiKey, async (req, res) => {
  let cone;
  try {
    cone = await oracledb.getConnection(dbConfig);
    
    const rut = req.params.rut;
    const {
      nombre, primer_apellido, segundo_apellido, contrasenia, imagen, genero,
      correo, direccion, telefono, fecha_nacimiento, tipo_usuario, sucursal, comuna
    } = req.body;

    // Consulta SQL corregida
    const query = `
      UPDATE usuario 
      SET nombre = :nombre,
          primer_apellido = :primer_apellido,
          segundo_apellido = :segundo_apellido,
          contrasenia = :contrasenia,
          imagen = :imagen,
          genero = :genero,
          correo = :correo,
          direccion = :direccion,
          telefono = :telefono,
          fecha_nacimiento = TO_DATE(:fecha_nacimiento, 'YYYY-MM-DD'),
          id_tipo_usuario = :tipo_usuario,
          id_sucursal = :sucursal,
          id_comuna = :comuna
      WHERE rut_usuario = :rut
    `;

    const binds = {
      rut,
      nombre,
      primer_apellido,
      segundo_apellido,
      contrasenia,
      imagen,
      genero,
      correo,
      direccion,
      telefono,
      fecha_nacimiento,
      tipo_usuario,
      sucursal,
      comuna
    };

    const result = await cone.execute(query, binds, { autoCommit: true });

    if (result.rowsAffected === 0) {
      res.status(404).json({ mensaje: "Usuario no encontrado" });
    } else {
      res.json({ mensaje: 'Usuario actualizado correctamente' });
    }
  } catch (error) {
    console.error('Error en PUT /usuarios:', error);
    res.status(500).json({ 
      error: error.message,
      detalles: 'Revise los nombres de columna y valores enviados'
    });
  } finally {
    if (cone) await cone.close();
  }
});


// ... (resto de tus imports y configuraciones)


app.delete('/usuarios/:rut', validarApiKey, async (req, res) => {
    let cone;
    const rut = req.params.rut;
    
    try {
        cone = await oracledb.getConnection(dbConfig);
        
        // 1. Obtener la imagen del usuario
        const result = await cone.execute(
            `SELECT imagen FROM usuario WHERE rut_usuario = :rut`, 
            [rut]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Usuario no encontrado" });
        }

        const imagenUrl = result.rows[0][0];
        
        // 2. Eliminar el usuario
        await cone.execute(
            `DELETE FROM usuario WHERE rut_usuario = :rut`,
            [rut],
            { autoCommit: true }
        );

        // 3. Eliminar la imagen si existe
        if (imagenUrl) {
            try {
                const filename = imagenUrl.split('/uploads/')[1];
                const filePath = path.join(__dirname, 'uploads', filename);
                
                if (fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath);
                    console.log(`Imagen eliminada: ${filename}`);
                }
            } catch (error) {
                console.error("Error al eliminar la imagen:", error);
            }
        }

        res.json({ success: true, message: "Usuario eliminado correctamente" });

    } catch (error) {
        console.error("Error en DELETE /usuarios:", error);
        res.status(500).json({ error: error.message });
    } finally {
        if (cone) await cone.close();
    }
});
app.patch('/usuarios/:rut',validarApiKey, async(req, res) => {
    let cone
    const rut = req.params.rut;
    const {nombre,primer_apellido,segundo_apellido,genero,correo,direccion,telefono,fecha_nacimiento,id_tipo_usuario,id_sucursal,id_comuna} = req.body
    try {
        cone = await oracledb.getConnection(dbConfig)
        let campos = []
        let valores = {}
        if (nombre !== undefined){
            campos.push('nombre = :nombre')
            valores.nombre = nombre
        }
        if(primer_apellido!==undefined){
            campos.push('primer_apellido = :primer_apellido')
            valores.primer_apellido = primer_apellido
        }
        if(segundo_apellido!==undefined){
            campos.push('segundo_apellido = :segundo_apellido')
            valores.segundo_apellido = segundo_apellido
        }
        if(genero!==undefined){
            campos.push('genero = :genero')
            valores.genero = genero
        }
        if(correo!==undefined){
            campos.push('correo = :correo')
            valores.correo = correo
        }
        if(direccion!==undefined){
            campos.push('direccion = :direccion')
            valores.direccion = direccion
        }
        if(telefono!==undefined){
            campos.push('telefono = :telefono')
            valores.telefono = telefono
        }
        if(fecha_nacimiento!==undefined){
            campos.push('fecha_nacimiento = :fecha_nacimiento')
            valores.fecha_nacimiento = fecha_nacimiento
        }
        if(id_tipo_usuario!==undefined){
            campos.push('id_tipo_usuario = :id_tipo_usuario')
            valores.id_tipo_usuario = id_tipo_usuario
        }
        if(id_sucursal!==undefined){
            campos.push('id_sucursal = :id_sucursal')
            valores.id_sucursal = id_sucursal
        }
        if(id_comuna!==undefined){
            campos.push('id_comuna = :id_comuna')
            valores.id_comuna = id_comuna
        }
        if(campos.length===0){
            res.status(400).json({mensaje: 'No se enviaron campos para actualizar'})
        }
        valores.rut = rut
        const sql = `UPDATE usuario SET ${campos.join(', ')} WHERE rut = :rut`
        const result = await cone.execute(
            sql, valores, {autoCommit: true}
        )
        if(result.rowsAffected===0){
            res.status(404).json({mensaje: "Usuario no existe"})
        }else{
            res.json({mensaje: "Usuario actualizado parcialmente"})
        }
    } catch (error) {
        res.status(500).json({error: error.message})
    } finally {
        if (cone) cone.close()
    }
})
//5. Levantar la API (hacer que escuche)
app.listen(puerto,()=>{
    console.log(`API escuchando en puerto ${puerto}`)
})