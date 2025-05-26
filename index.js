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
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE','OPTIONS'],
    allowedHeaders: ['Content-Type', 'x-api-key','Authorization']
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
    const bcrypt = require('bcrypt');
    const SALT_ROUNDS = 10;
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
        res.status(200).json({mensaje: "Gestión API de Usuarios Con Express"})
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
                contrasenia: row[5],
                imagen: row[6],
                genero : row[7],
                correo : row[8],
                direccion : row[9],
                telefono : row[10],
                fecha_nacimiento : row[11],
                tipo_usuario : row[12],
                sucursal : row[13],
                comuna : row[14],
                })
            }
        } catch (error) {
            res.status(500).json({error: error.message})
        } finally {
            if (cone) cone.close()
        }
    })

app.post('/usuarios', validarApiKey, async (req, res) => {
    let cone;
    const {
        rut, nombre, primer_apellido, segundo_apellido, contrasenia, imagen, genero,
        correo, direccion, telefono, fecha_nacimiento, tipo_usuario, sucursal, comuna,
    } = req.body;

    try {
        cone = await oracledb.getConnection(dbConfig);

        const contraseniaEncriptada = await bcrypt.hash(contrasenia, SALT_ROUNDS);

        await cone.execute(
            `INSERT INTO usuario
            (rut_usuario, nombre, primer_apellido, segundo_apellido,cambio_clave_obligatorio, contrasenia, imagen,
             genero, correo, direccion, telefono, fecha_nacimiento, id_tipo_usuario, 
             id_sucursal, id_comuna)
            VALUES(:rut, :nombre, :primer_apellido, :segundo_apellido,:cambio_clave_obligatorio, :contrasenia, :imagen,
                   :genero, :correo, :direccion, :telefono, TO_DATE(:fecha_nacimiento, 'YYYY-MM-DD'),
                   :tipo_usuario, :sucursal, :comuna)`,
            {
                rut,
                nombre,
                primer_apellido,
                segundo_apellido,
                contrasenia: contraseniaEncriptada,
                imagen,
                genero,
                correo,
                direccion,
                telefono,
                fecha_nacimiento,
                tipo_usuario,
                sucursal,
                comuna,
                cambio_clave_obligatorio: 'S'  // Por defecto obliga a cambiar clave
            },
            { autoCommit: true }
        );

        res.status(201).json({ mensaje: "Usuario creado" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    } finally {
        if (cone) await cone.close();
    }
});
const nodemailer = require('nodemailer');
const crypto = require('crypto');

const tokens = {}; // En memoria, puedes usar una tabla en BD para producción

app.post('/recuperar-password',validarApiKey, async (req, res) => {
  const { correo } = req.body;

  if (!correo) return res.status(400).json({ mensaje: 'Correo requerido' });

  let cone;
  try {
    cone = await oracledb.getConnection(dbConfig);
    const result = await cone.execute(
      `SELECT rut_usuario FROM usuario WHERE correo = :correo`, { correo }
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ mensaje: 'Usuario no encontrado' });
    }

    const rut = result.rows[0][0];
    const token = crypto.randomBytes(20).toString('hex');
    tokens[token] = { rut, expira: Date.now() + 3600000 }; // 1 hora

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: 'losclavitosdepablito@gmail.com',
        pass: 'flyx tumr lcbk ngeu' 
      }
    });

    const resetUrl = `http://localhost:8100/contrasenia?token=${token}`;
    await transporter.sendMail({
      to: correo,
      subject: 'Recuperación de Contraseña',
      html: `<p>Haz clic <a href="${resetUrl}">aquí</a> para reestablecer tu contraseña.</p>`
    });

    res.json({ mensaje: 'Correo enviado' });

  } catch (error) {
    res.status(500).json({ error: error.message });
  } finally {
    if (cone) await cone.close();
  }
});
app.post('/reset-password', validarApiKey,async (req, res) => {
  const { token, nuevaContrasenia } = req.body;

  if (!token || !nuevaContrasenia) return res.status(400).json({ mensaje: 'Datos incompletos' });

  const datos = tokens[token];
  if (!datos || Date.now() > datos.expira) {
    return res.status(400).json({ mensaje: 'Token inválido o expirado' });
  }

  const contraseniaHash = await bcrypt.hash(nuevaContrasenia, SALT_ROUNDS);

  let cone;
  try {
    cone = await oracledb.getConnection(dbConfig);
    await cone.execute(
      `UPDATE usuario SET contrasenia = :contrasenia WHERE rut_usuario = :rut`,
      { contrasenia: contraseniaHash, rut: datos.rut },
      { autoCommit: true }
    );
    delete tokens[token]; // Eliminar token tras usarlo
    res.json({ mensaje: 'Contraseña actualizada' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (cone) await cone.close();
  }
});


    app.put('/usuarios/:rut', validarApiKey, async (req, res) => {
    let cone;
    try {
        cone = await oracledb.getConnection(dbConfig);
        
        const rut = req.params.rut;
        let {
        nombre, primer_apellido, segundo_apellido, contrasenia, imagen, genero,
        correo, direccion, telefono, fecha_nacimiento, tipo_usuario, sucursal, comuna
        } = req.body;
        let cambioClaveObligatorio = 'N';
        if (typeof contrasenia === 'string' && contrasenia.trim() !== '') {
            contrasenia = await bcrypt.hash(contrasenia, SALT_ROUNDS);
            cambioClaveObligatorio = 'N';
        } else {
            
            const resultado = await cone.execute(
                `SELECT contrasenia,cambio_clave_obligatorio FROM usuario WHERE rut_usuario = :rut`,
                { rut }
            );
            if (resultado.rows.length === 0) {
                return res.status(404).json({ mensaje: "Usuario no encontrado" });
            }
            contrasenia = resultado.rows[0][0];
            cambioClaveObligatorio = resultado.rows[0][1]; 
        }
        
        const query = `
        UPDATE usuario 
        SET nombre = :nombre,
            primer_apellido = :primer_apellido,
            segundo_apellido = :segundo_apellido,
            contrasenia = :contrasenia,
            cambio_clave_obligatorio = :cambio_clave_obligatorio,
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
        cambio_clave_obligatorio: cambioClaveObligatorio,
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


app.patch('/usuarios/:rut', validarApiKey, async (req, res) => {
  let cone;
  const rut = req.params.rut;
  const {
    nombre, primer_apellido, segundo_apellido, imagen, contrasenia, correo, direccion, telefono, fecha_nacimiento, id_comuna
  } = req.body;

  try {
    cone = await oracledb.getConnection(dbConfig);

    let campos = [];
    let valores = {};
    let cambioClaveObligatorio = null;
    if (nombre !== undefined) {
      campos.push('nombre = :nombre');
      valores.nombre = nombre;
    }
    if (primer_apellido !== undefined) {
      campos.push('primer_apellido = :primer_apellido');
      valores.primer_apellido = primer_apellido;
    }
    if (segundo_apellido !== undefined) {
      campos.push('segundo_apellido = :segundo_apellido');
      valores.segundo_apellido = segundo_apellido;
    }
    if (contrasenia !== undefined) {
      if (typeof contrasenia === 'string' && contrasenia.trim() !== '') {
        valores.contrasenia = await bcrypt.hash(contrasenia, SALT_ROUNDS);
        campos.push('contrasenia = :contrasenia');
        cambioClaveObligatorio = 'N';
      } else {
        return res.status(400).json({ mensaje: 'Contraseña inválida' });
      }
    }
    if (imagen !== undefined) {
      campos.push('imagen = :imagen');
      valores.imagen = imagen;
    }
    if (correo !== undefined) {
      campos.push('correo = :correo');
      valores.correo = correo;
    }
    if (direccion !== undefined) {
      campos.push('direccion = :direccion');
      valores.direccion = direccion;
    }
    if (telefono !== undefined) {
      campos.push('telefono = :telefono');
      valores.telefono = telefono;
    }
    if (fecha_nacimiento !== undefined) {
      // Validar formato fecha o parsear antes
      campos.push(`fecha_nacimiento = TO_DATE(:fecha_nacimiento, 'YYYY-MM-DD')`);
      valores.fecha_nacimiento = fecha_nacimiento;
    }
    if (id_comuna !== undefined) {
      campos.push('id_comuna = :id_comuna');
      valores.id_comuna = id_comuna;
    }
    if (cambioClaveObligatorio !== null) {
      campos.push('cambio_clave_obligatorio = :cambio_clave_obligatorio');
      valores.cambio_clave_obligatorio = cambioClaveObligatorio;
    }

    if (campos.length === 0) {
      return res.status(400).json({ mensaje: 'No se enviaron campos para actualizar' });
    }

    valores.rut = rut;

    const sql = `UPDATE usuario SET ${campos.join(', ')} WHERE rut_usuario = :rut`;

    const result = await cone.execute(sql, valores, { autoCommit: true });
    console.log('Filas afectadas:', result.rowsAffected);

    if (result.rowsAffected === 0) {
      return res.status(404).json({ mensaje: "Usuario no existe" });
    }

    res.json({ mensaje: "Usuario actualizado parcialmente" });

  } catch (error) {
    console.error('Error en PATCH /usuarios/:rut:', error);
    res.status(500).json({ error: error.message });
  } finally {
    if (cone) await cone.close();
  }
});




    const jwt = require('jsonwebtoken');
    const SECRET_KEY = 'bd_clavitos'; 

    
    app.post('/login', async (req, res) => {
    let cone;
    const { correo, contrasenia } = req.body;

    try {   
        cone = await oracledb.getConnection(dbConfig);
        const result = await cone.execute(
        `SELECT rut_usuario, nombre, id_tipo_usuario,contrasenia ,cambio_clave_obligatorio
        FROM usuario 
        WHERE correo = :correo`,
        { correo}
        );

        if (result.rows.length === 0) {
        return res.status(401).json({ error: "Credenciales inválidas" });
        }
        const row = result.rows[0];
        const isMatch = await bcrypt.compare(contrasenia, row[3]);
        if (!isMatch) {
        return res.status(401).json({ error: "Credenciales inválidas" });
    }
        const user = {
            rut: row[0],
            nombre: row[1],
            tipoUsuario: row[2],
            cambioClaveObligatorio: row[4] === 'S'
          };

        // Genera token JWT válido por 1 hora
        const token = jwt.sign(user, SECRET_KEY, { expiresIn: '1h' });

        res.json({ 
        mensaje: "Login exitoso",
        token,
        usuario: user
        });

    } catch (error) {
        res.status(500).json({ error: error.message });
    } finally {
        if (cone) await cone.close();
    }
    });

app.post('/usuarios/validar-token', async (req, res) => {
  try {
    // 1. Obtener token del header Authorization
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: "Token no proporcionado" });
    }

    const token = authHeader.split(' ')[1]; 
    
  
    const decoded = jwt.verify(token, SECRET_KEY);

    
    let cone;
    try {
      cone = await oracledb.getConnection(dbConfig);
      const result = await cone.execute(
        `SELECT rut_usuario, nombre, id_tipo_usuario 
         FROM usuario 
         WHERE rut_usuario = :rut`,
        { rut: decoded.rut }
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ mensaje: "Usuario no encontrado" });
      }

      // 4. Devolver datos del usuario
      const usuario = {
        rut: result.rows[0][0],
        nombre: result.rows[0][1],
        tipoUsuario: result.rows[0][2]
      };

      res.json({ 
        valid: true,
        usuario: usuario
      });

    } finally {
      if (cone) await cone.close();
    }

  } catch (err) {
    console.error('Error validando token:', err);
    
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: "Token expirado" });
    }
    
    res.status(401).json({ 
      valid: false,
      error: "Token inválido",
      detalles: err.message 
    });
  }
});
app.post('/usuarios/usuario-actual', async (req, res) => {
  try {
    // 1. Verificar token
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: "Token no proporcionado" });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, SECRET_KEY);

    // 2. Obtener datos completos del usuario
    let cone;
    try {
      cone = await oracledb.getConnection(dbConfig);
      const result = await cone.execute(
        `SELECT 
            u.rut_usuario,
            u.nombre,
            u.primer_apellido,
            u.segundo_apellido,
            u.imagen,
            u.genero,
            u.correo,
            u.direccion,
            u.telefono,
            u.fecha_nacimiento,
            u.id_sucursal,                  
            u.id_comuna,                      
            tu.descripcion as tipo_usuario,
            s.nombre_sucursal,
            c.nombre_comuna
         FROM usuario u
         JOIN tipo_usuario tu ON u.id_tipo_usuario = tu.id_tipo_usuario
         JOIN sucursal s ON u.id_sucursal = s.id_sucursal
         JOIN comuna c ON u.id_comuna = c.id_comuna
         WHERE u.rut_usuario = :rut`,
        { rut: decoded.rut }
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ mensaje: "Usuario no encontrado" });
      }

      const row = result.rows[0];
      res.json({
        rut: row[0],
        nombre: row[1],
        primer_apellido: row[2],
        segundo_apellido: row[3],
        imagen: row[4],
        genero: row[5],
        correo: row[6],
        direccion: row[7],
        telefono: row[8],
        fecha_nacimiento: row[9],
        id_sucursal: row[10],               
        id_comuna: row[11],                 
        tipo_usuario: row[12],
        sucursal: row[13],
        comuna: row[14]
      });

    } finally {
      if (cone) await cone.close();
    }

  } catch (err) {
    console.error('Error obteniendo usuario:', err);
    
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: "Token expirado" });
    }
    
    res.status(401).json({ 
      error: "Token inválido",
      detalles: err.message 
    });
  }
});

app.get('/sucursal/:id/comuna', validarApiKey, async (req, res) => {
  let cone;
  try {
    cone = await oracledb.getConnection(dbConfig);
    const result = await cone.execute(`
      SELECT 
        s.id_sucursal,
        s.nombre_sucursal, 
        s.direccion,    
        s.telefono,
        c.id_comuna,
        c.nombre_comuna,
        c.id_region
      FROM sucursal s
      JOIN comuna c ON s.id_comuna = c.id_comuna
      WHERE s.id_sucursal = :id`, 
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Sucursal no encontrada" });
    }

    const row = result.rows[0];
    res.json({
      id_sucursal: row[0],
      nombre_sucursal: row[1],
      direccion: row[2],
      telefono: row[3],
      comuna: {
        id_comuna: row[4],
        nombre_comuna: row[5],
        id_region: row[6]
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  } finally {
    if (cone) await cone.close();
  }
});


(async () => {
  const adminHash = await bcrypt.hash('Admin123.', 10);
  const mariaHash = await bcrypt.hash('bodega456', 10);
  const carlosHash = await bcrypt.hash('contador123', 10);

  console.log('Admin:', adminHash);
  console.log('María:', mariaHash);
  console.log('Carlos:', carlosHash);
})();
app.listen(puerto,()=>{
    console.log(`API escuchando en puerto ${puerto}`)
})