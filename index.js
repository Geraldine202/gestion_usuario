//1.Importar librerias
const express = require('express')
const oracledb = require('oracledb')
const cors = require('cors');
//2. Vamos a crear nuestra api
const app = express()
const puerto = 3000
const dbConfig = {
    user: 'gestion_usuarios',
    password: 'gestion_usuarios',
    connectString: 'localhost/XE'
    //connectString: 'localhost/orcl.duoc.com.cl'
}
const API_KEY ='gestion_usuarios123.'
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
//3. Middelware:facilita la comunicacion entre datos
app.use(express.json())

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
            genero : row[4],
            correo : row[5],
            direccion : row[6],
            telefono : row[7],
            fecha_nacimiento : row[8],
            tipo_usuario : row[9],
            sucursal : row[10],
            comuna : row[11],
        })))
    }catch(ex){
        res.status(500).json({error: ex.message} )
    }finally{
        if (cone) cone.close()
    }
})

//Busca usuarios
app.get('/usuarios/:rut', async (req, res) => {
    let cone
    const rut = parseInt(req.params.rut)
    try {
        cone = await oracledb.getConnection(dbConfig)
        const result = await cone.execute(
            'SELECT * FROM usuario WHERE rut = :rut', [rut]
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
            genero : row[4],
            correo : row[5],
            direccion : row[6],
            telefono : row[7],
            fecha_nacimiento : row[8],
            id_tipo_usuario : row[9],
            id_sucursal : row[10],
            id_comuna : row[11],
            })
        }
    } catch (error) {
        res.status(500).json({error: error.message})
    } finally {
        if (cone) cone.close()
    }
})

app.post('/usuarios', async (req, res) => {
    let cone;
    const {rut,nombre,primer_apellido,segundo_apellido,genero,correo,direccion,telefono,fecha_nacimiento,tipo_usuario,sucursal,comuna} = req.body;
    try {
        cone = await oracledb.getConnection(dbConfig);

        // Obtener id_tipo_usuario a partir de tipo_usuario (nombre)
        const resultTipoUsuario = await cone.execute(
            `SELECT id_tipo_usuario FROM tipo_usuario WHERE descripcion = :descripcion`,
            [tipo_usuario]
        );
        if(resultTipoUsuario.rows.length === 0) {
            return res.status(400).json({error: "Tipo de usuario no válido"});
        }
        const id_tipo_usuario = resultTipoUsuario.rows[0][0];

        // Obtener id_sucursal a partir de sucursal (nombre)
        const resultSucursal = await cone.execute(
            `SELECT id_sucursal FROM sucursal WHERE nombre_sucursal = :nombre_sucursal`,
            [sucursal]
        );
        if(resultSucursal.rows.length === 0) {
            return res.status(400).json({error: "Sucursal no válida"});
        }
        const id_sucursal = resultSucursal.rows[0][0];

        // Obtener id_comuna a partir de comuna (nombre)
        const resultComuna = await cone.execute(
            `SELECT id_comuna FROM comuna WHERE nombre_comuna = :nombre_comuna`,
            [comuna]
        );
        if(resultComuna.rows.length === 0) {
            return res.status(400).json({error: "Comuna no válida"});
        }
        const id_comuna = resultComuna.rows[0][0];

        // Ahora insertamos usando los IDs
        await cone.execute(
            `INSERT INTO usuario VALUES(:rut, :nombre, :primer_apellido, :segundo_apellido, :genero, :correo, :direccion, :telefono, TO_DATE(:fecha_nacimiento,'YYYY-MM-DD'), :id_tipo_usuario, :id_sucursal, :id_comuna)`,
            { rut, nombre, primer_apellido, segundo_apellido, genero, correo, direccion, telefono, fecha_nacimiento, id_tipo_usuario, id_sucursal, id_comuna },
            { autoCommit: true }
        );
        res.status(201).json({mensaje: "Usuario creado"});
    } catch (error) {
        res.status(500).json({error: error.message});
    } finally {
        if(cone) cone.close();
    }
});


app.put('/usuarios/:rut', async(req, res) => {
    let cone
    const rut = parseInt(req.params.rut)
    const {nombre,primer_apellido,segundo_apellido,genero,correo,direccion,telefono,fecha_nacimiento,id_tipo_usuario,id_sucursal,id_comuna} = req.body
    try {
        cone = await oracledb.getConnection(dbConfig)
        const result = await cone.execute(
            `UPDATE usuario
            SET nombre = :nombre,primer_apellido = :primer_apellido,segundo_apellido = :segundo_apellido,genero = :genero,correo = :correo,direccion = :direccion,telefono = :telefono,fecha_nacimiento = :fecha_nacimiento,id_tipo_usuario = :id_tipo_usuario,id_sucursal = :id_sucursal,id_comuna = :id_comuna
            WHERE rut = :rut`
            ,{rut,nombre,primer_apellido,segundo_apellido,genero,correo,direccion,telefono,fecha_nacimiento,id_tipo_usuario,id_sucursal,id_comuna}
            ,{autoCommit: true}
        )
        if(result.rowsAffected===0){
            res.status(404).json({mensaje: "Usuario no encontrado"})
        }else{
            res.json({mensaje: 'Usuario actualizado'})
        }
    } catch (error) {
        res.status(500).json({error: error.message})
    } finally {
        if (cone) cone.close()
    }
})

app.delete('/usuarios/:rut', async (req, res) => {
    let cone
    const rut = parseInt(req.params.rut)
    try {
        cone = await oracledb.getConnection(dbConfig)
        const result = await cone.execute(
            `DELETE FROM usuario
            WHERE rut = :rut`
            ,[rut]
            ,{autoCommit: true}
        )
        if(result.rowsAffected===0){
            res.status(404).json({mensaje: "Usuario no encontrado"})
        }else{
            res.json({mensaje: "Usuario eliminado"})
        }
    } catch (error) {
        res.status(500).json({error: error.message})
    } finally {
        if (cone) cone.close()
    }
})

app.patch('/usuarios/:rut', async(req, res) => {
    let cone
    const rut = parseInt(req.params.rut)
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