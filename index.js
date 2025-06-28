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
        //connectString: '192.168.1.93/XE'
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
    app.get('/pagos',validarApiKey,async (req,res)=>{
        let cone
        try{
            cone = await oracledb.getConnection(dbConfig)
            const result = await cone.execute(`
          SELECT
            p.id_pago,
            p.monto_total,
            p.fecha_pago,
            tp.descripcion AS tipo_pago,
            u.nombre || ' ' || u.primer_apellido || ' ' || u.segundo_apellido AS nombre_completo,
            ep.descripcion AS estado_pago,
            p.id_pedido,
            p.imagen
          FROM pago p
          LEFT JOIN tipo_pago tp ON p.id_tipo_pago = tp.id_tipo_pago
          LEFT JOIN usuario u ON p.rut_usuario = u.rut_usuario
          LEFT JOIN pedido ped ON p.id_pedido = ped.id_pedido
          LEFT JOIN estado_pago ep ON ped.id_estado_pago = ep.id_estado_pago`)
            res.status(200).json(result.rows.map(row => ({
                id_pago : row[0],
                monto_total : row[1],
                fecha_pago: row[2],
                id_tipo_pago: row[3],
                rut_usuario: row[4],
                id_pedido: row[5],
                imagen: row[6]
            })))
        }catch(ex){
            res.status(500).json({error: ex.message} )
        }finally{
            if (cone) cone.close()
        }
    })

    // Obtener pagos pendientes de aprobación (con información completa)
app.get('/pagos_pendientes', validarApiKey, async (req, res) => {
    let cone;
    try {
        cone = await oracledb.getConnection(dbConfig);
        
        const query = `
        SELECT 
            p.id_pago,
            p.monto_total,
            p.fecha_pago,
            p.imagen,
            tp.descripcion AS tipo_pago,
            ep.descripcion AS estado_pago,
            pd.id_pedido,
            pd.total_a_pagar,
            u.rut_usuario,
            u.nombre || ' ' || u.primer_apellido AS cliente,
            s.nombre_sucursal
        FROM 
            pago p
        JOIN 
            pedido pd ON p.id_pedido = pd.id_pedido
        JOIN 
            estado_pago ep ON pd.id_estado_pago = ep.id_estado_pago
        JOIN 
            tipo_pago tp ON p.id_tipo_pago = tp.id_tipo_pago
        JOIN 
            usuario u ON pd.rut_usuario = u.rut_usuario
        LEFT JOIN 
            sucursal s ON pd.id_sucursal = s.id_sucursal
        WHERE 
            pd.id_estado_pago = 1  -- Solo pagos pendientes
        ORDER BY 
            p.fecha_pago ASC`;

        const result = await cone.execute(query);
        
        const pagos = result.rows.map(row => ({
            id_pago: row[0],
            monto_total: row[1],
            fecha_pago: row[2],
            imagen_comprobante: row[3],
            tipo_pago: row[4],
            estado_pago: row[5],
            id_pedido: row[6],
            total_pedido: row[7],
            rut_cliente: row[8],
            nombre_cliente: row[9],
            sucursal: row[10]
        }));

        res.status(200).json(pagos);
    } catch (ex) {
        console.error('Error al obtener pagos pendientes:', ex);
        res.status(500).json({ error: ex.message });
    } finally {
        if (cone) await cone.close();
    }
});
// Actualizar estado del pedido (directamente)
app.patch('/pedidos/:id_pedido', validarApiKey, async (req, res) => {
    let cone;
    const { id_pedido } = req.params;
    const { nuevo_estado } = req.body; // 2 = Aprobado, 3 = Rechazado

    try {
        cone = await oracledb.getConnection(dbConfig);
        
        // Actualizar estado
        const result = await cone.execute(
            `UPDATE pedido 
             SET id_estado_pago = :nuevo_estado 
             WHERE id_pedido = :id_pedido`,
            [nuevo_estado, id_pedido],
            { autoCommit: true }
        );

        if (result.rowsAffected === 0) {
            return res.status(404).json({ 
                success: false,
                error: "Pedido no encontrado" 
            });
        }

        res.status(200).json({ 
            success: true,
            message: "Estado de pago actualizado correctamente",
            id_pedido,
            nuevo_estado
        });

    } catch (ex) {
        console.error('Error al actualizar estado:', ex);
        res.status(500).json({ 
            success: false,
            error: ex.message
        });
    } finally {
        if (cone) await cone.close();
    }
});

app.get('/pedidos-pagados', validarApiKey, async (req, res) => {
  let cone;
  try {
    cone = await oracledb.getConnection(dbConfig);
    const result = await cone.execute(`
      SELECT p.*, ep.descripcion as estado_pago_desc, 
             ept.descripcion as estado_pedido_desc,
             u.nombre || ' ' || u.primer_apellido as cliente
      FROM pedido p
      JOIN estado_pago ep ON p.id_estado_pago = ep.id_estado_pago
      JOIN estado_pedido ept ON p.id_estado_pedido = ept.id_estado_pedido
      JOIN usuario u ON p.rut_usuario = u.rut_usuario
      WHERE p.id_estado_pago = 2 AND p.id_estado_pedido = 1
      ORDER BY p.fecha_pedido DESC`);

    res.status(200).json(result.rows.map(row => ({
      id_pedido: row[0],
      descripcion: row[1],
      total_a_pagar: row[2],
      cantidad: row[3],
      tiene_descuento: row[4],
      fecha_pedido: row[5],
      id_sucursal: row[6],
      estado_pago: row[7],
      estado_pedido: row[8],
      id_entrega: row[9],
      rut_usuario: row[10],
      cliente: row[11]
    })));
  } catch (ex) {
    res.status(500).json({ error: ex.message });
  } finally {
    if (cone) await cone.close();
  }
});
app.patch('/pedidos/:id_pedido/preparacion', validarApiKey, async (req, res) => {
    let cone;
    const { id_pedido } = req.params;

    try {
        cone = await oracledb.getConnection(dbConfig);

        // Iniciar transacción

        // 1. Obtener los productos del pedido con sus cantidades (cantidad tomada de PEDIDO)
        const detallesQuery = `
            SELECT dp.ID_PRODUCTO, p.NOMBRE, p.STOCK, ped.CANTIDAD
            FROM DETALLE_PEDIDO dp
            JOIN PRODUCTO p ON dp.ID_PRODUCTO = p.ID_PRODUCTO
            JOIN PEDIDO ped ON dp.ID_PEDIDO = ped.ID_PEDIDO
            WHERE dp.ID_PEDIDO = :id_pedido
        `;
        const detallesResult = await cone.execute(detallesQuery, [id_pedido]);

        if (detallesResult.rows.length === 0) {
            throw new Error('No se encontraron productos para este pedido');
        }

        // 2. Verificar stock suficiente para todos los productos (usando cantidad global)
        for (const detalle of detallesResult.rows) {
            const id_producto = detalle[0];
            const nombre = detalle[1];
            const stockActual = detalle[2];
            const cantidadPedida = detalle[3];

            if (stockActual < cantidadPedida) {
                throw new Error(`Stock insuficiente para ${nombre}. Stock actual: ${stockActual}, cantidad pedida: ${cantidadPedida}`);
            }
        }

        // 3. Actualizar stock de cada producto (restar cantidad global a cada producto)
        for (const detalle of detallesResult.rows) {
            const id_producto = detalle[0];
            const cantidadPedida = detalle[3];

            await cone.execute(
                `UPDATE PRODUCTO SET STOCK = STOCK - :cantidad 
                 WHERE ID_PRODUCTO = :id_producto`,
                [cantidadPedida, id_producto]
            );
        }

        // 4. Actualizar estado del pedido a "en preparación" (estado 2)
        const updatePedido = await cone.execute(
            `UPDATE PEDIDO 
             SET ID_ESTADO_PEDIDO = 2 
             WHERE ID_PEDIDO = :id_pedido`,
            [id_pedido]
        );

        if (updatePedido.rowsAffected === 0) {
            throw new Error("Pedido no encontrado");
        }

        // Confirmar transacción
        await cone.execute('COMMIT');

        res.status(200).json({ 
            success: true,
            message: "Pedido actualizado a 'Preparación' y stock reducido",
            id_pedido
        });

    } catch (ex) {
        // Rollback en caso de error
        if (cone) await cone.execute('ROLLBACK');
        
        console.error('Error al actualizar a preparación:', ex);
        res.status(500).json({ 
            success: false,
            error: ex.message
        });
    } finally {
        if (cone) await cone.close();
    }
});

app.patch('/pedidos/:id_pedido/listo-para-entrega', validarApiKey, async (req, res) => {
    let cone;
    const { id_pedido } = req.params;

    try {
        cone = await oracledb.getConnection(dbConfig);

        const result = await cone.execute(
            `UPDATE pedido 
             SET id_estado_pedido = 5 
             WHERE id_pedido = :id_pedido`,
            [id_pedido],
            { autoCommit: true }
        );

        if (result.rowsAffected === 0) {
            return res.status(404).json({ 
                success: false,
                error: "Pedido no encontrado" 
            });
        }

        res.status(200).json({ 
            success: true,
            message: "Pedido actualizado a 'Listo para entrega'",
            id_pedido
        });

    } catch (ex) {
        console.error('Error al actualizar a listo para entrega:', ex);
        res.status(500).json({ 
            success: false,
            error: ex.message
        });
    } finally {
        if (cone) await cone.close();
    }
});

app.get('/pedidos-estado-2', validarApiKey, async (req, res) => {
  let connection;
  try {
    connection = await oracledb.getConnection(dbConfig);
    
    const sql = `
      SELECT 
        p.id_pedido,
        p.descripcion,
        p.total_a_pagar,
        p.cantidad,
        p.tiene_descuento,
        p.fecha_pedido,
        p.id_sucursal,
        ep.descripcion AS estado_pago_desc,
        ept.descripcion AS estado_pedido_desc,
        p.id_entrega,
        p.rut_usuario,
        u.nombre || ' ' || u.primer_apellido AS cliente
      FROM pedido p
      JOIN estado_pago ep ON p.id_estado_pago = ep.id_estado_pago
      JOIN estado_pedido ept ON p.id_estado_pedido = ept.id_estado_pedido
      JOIN usuario u ON p.rut_usuario = u.rut_usuario
      WHERE p.id_estado_pedido = 2
      ORDER BY p.fecha_pedido DESC
    `;

    const result = await connection.execute(sql);

    const pedidos = result.rows.map(row => ({
      id_pedido: row[0],
      descripcion: row[1],
      total_a_pagar: row[2],
      cantidad: row[3],
      tiene_descuento: row[4],
      fecha_pedido: row[5],
      id_sucursal: row[6],
      estado_pago: row[7],
      estado_pedido: row[8],
      id_entrega: row[9],
      rut_usuario: row[10],
      cliente: row[11],
    }));

    res.status(200).json(pedidos);
  } catch (error) {
    res.status(500).json({ error: error.message });
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (err) {
        console.error('Error closing connection', err);
      }
    }
  }
});
app.get('/pedidos-listos', validarApiKey, async (req, res) => {
  let connection;
  try {
    connection = await oracledb.getConnection(dbConfig);
    
    const sql = `
      SELECT 
        p.id_pedido,
        p.descripcion,
        p.total_a_pagar,
        p.cantidad,
        p.tiene_descuento,
        p.fecha_pedido,
        p.id_sucursal,
        ep.descripcion AS estado_pago_desc,
        ept.descripcion AS estado_pedido_desc,
        p.id_entrega,
        p.rut_usuario,
        u.nombre || ' ' || u.primer_apellido AS cliente
      FROM pedido p
      JOIN estado_pago ep ON p.id_estado_pago = ep.id_estado_pago
      JOIN estado_pedido ept ON p.id_estado_pedido = ept.id_estado_pedido
      JOIN usuario u ON p.rut_usuario = u.rut_usuario
      WHERE p.id_estado_pedido = 5
      ORDER BY p.fecha_pedido DESC
    `;

    const result = await connection.execute(sql);

    const pedidos = result.rows.map(row => ({
      id_pedido: row[0],
      descripcion: row[1],
      total_a_pagar: row[2],
      cantidad: row[3],
      tiene_descuento: row[4],
      fecha_pedido: row[5],
      id_sucursal: row[6],
      estado_pago: row[7],
      estado_pedido: row[8],
      id_entrega: row[9],
      rut_usuario: row[10],
      cliente: row[11],
    }));

    res.status(200).json(pedidos);
  } catch (error) {
    res.status(500).json({ error: error.message });
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (err) {
        console.error('Error closing connection', err);
      }
    }
  }
});
app.patch('/pedidos/:id/despachar', validarApiKey, async (req, res) => {
  const pedidoId = req.params.id;
  let connection;

  try {
    connection = await oracledb.getConnection(dbConfig);

    const sql = `
      UPDATE pedido
      SET id_estado_pedido = 3
      WHERE id_pedido = :id
    `;

    const result = await connection.execute(sql, [pedidoId], { autoCommit: true });

    if (result.rowsAffected === 0) {
      return res.status(404).json({ message: 'Pedido no encontrado' });
    }

    res.status(200).json({ message: 'Pedido despachado correctamente' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (err) {
        console.error('Error al cerrar la conexión:', err);
      }
    }
  }
});
app.patch('/pedidos/:id/entregar', validarApiKey, async (req, res) => {
  const pedidoId = req.params.id;
  let connection;

  try {
    connection = await oracledb.getConnection(dbConfig);

    const sql = `
      UPDATE pedido
      SET id_estado_pedido = 4
      WHERE id_pedido = :id
    `;

    const result = await connection.execute(sql, [pedidoId], { autoCommit: true });

    if (result.rowsAffected === 0) {
      return res.status(404).json({ message: 'Pedido no encontrado' });
    }

    res.status(200).json({ message: 'Pedido marcado como entregado correctamente' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (err) {
        console.error('Error al cerrar la conexión:', err);
      }
    }
  }
});



    app.get('/pedidos',validarApiKey,async (req,res)=>{
        let cone
        try{
            cone = await oracledb.getConnection(dbConfig)
            const result = await cone.execute(`
            SELECT
              p.id_pedido,
              p.descripcion,
              p.total_a_pagar,
              p.cantidad,
              p.tiene_descuento,
              p.fecha_pedido,
              s.nombre_sucursal,
              ep.descripcion,
              ed.descripcion,
              e.descripcion,
              u.nombre
            FROM pedido p
            LEFT JOIN sucursal s ON p.id_sucursal = s.id_sucursal
            LEFT JOIN estado_pago ep ON p.id_estado_pago = ep.id_estado_pago
            LEFT JOIN estado_pedido ed ON p.id_estado_pedido = ed.id_estado_pedido
            LEFT JOIN tipo_entrega e ON p.id_entrega = e.id_entrega
            LEFT JOIN usuario u ON p.rut_usuario = u.rut_usuario`)
            res.status(200).json(result.rows.map(row => ({
                id_pedido : row[0],
                descripcion : row[1],
                total_a_pagar: row[2],
                cantidad: row[3],
                tiene_descuento: row[4],
                fecha_pedido: row[5],
                id_sucursal: row[6],
                id_estado_pago: row[7],
                id_estado_pedido: row[8],
                id_entrega: row[9],
                rut_usuario: row[10]
            })))
        }catch(ex){
            res.status(500).json({error: ex.message} )
        }finally{
            if (cone) cone.close()
        }
    })
        app.get('/pedidos',validarApiKey,async (req,res)=>{
        let cone
        try{
            cone = await oracledb.getConnection(dbConfig)
            const result = await cone.execute(`
            SELECT
            id_pedido,
            descripcion,
            total_a_pagar,
            cantidad,
            tiene_descuento,
            fecha_pedido,
            id_sucursal,
            id_estado_pago,
            id_estado_pedido,
            id_entrega,
            rut_usuario
            FROM pedido`)
            res.status(200).json(result.rows.map(row => ({
                id_pedido : row[0],
                descripcion : row[1],
                total_a_pagar: row[2],
                cantidad: row[3],
                tiene_descuento: row[4],
                fecha_pedido: row[5],
                id_sucursal: row[6],
                id_estado_pago: row[7],
                id_estado_pedido: row[8],
                id_entrega: row[9],
                rut_usuario: row[10]
            })))
        }catch(ex){
            res.status(500).json({error: ex.message} )
        }finally{
            if (cone) cone.close()
        }
    })
            app.get('/pedidoss',validarApiKey,async (req,res)=>{
        let cone
        try{
            cone = await oracledb.getConnection(dbConfig)
            const result = await cone.execute(`
            SELECT
            id_pedido,
            descripcion,
            total_a_pagar,
            cantidad,
            tiene_descuento,
            fecha_pedido,
            id_sucursal,
            id_estado_pago,
            id_estado_pedido,
            id_entrega,
            rut_usuario
            FROM pedido`)
            res.status(200).json(result.rows.map(row => ({
                id_pedido : row[0],
                descripcion : row[1],
                total_a_pagar: row[2],
                cantidad: row[3],
                tiene_descuento: row[4],
                fecha_pedido: row[5],
                id_sucursal: row[6],
                id_estado_pago: row[7],
                id_estado_pedido: row[8],
                id_entrega: row[9],
                rut_usuario: row[10]
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
     app.get('/productos_inventario',validarApiKey,async (req,res)=>{
        let cone
        try{
            cone = await oracledb.getConnection(dbConfig)
            const result = await cone.execute(`
            SELECT
                p.id_producto,
                p.nombre,
                p.descripcion,
                p.imagen,
                p.precio,
                p.stock,
                m.descripcion AS marca,
                i.descripcion AS inventario,
                c.descripcion AS categoria
            FROM producto p
            LEFT JOIN marca m ON p.id_marca = m.id_marca
            LEFT JOIN inventario i ON p.id_inventario = i.id_inventario
            LEFT JOIN categoria c ON p.id_categoria = c.id_categoria`)
            res.status(200).json(result.rows.map(row => ({
                id_producto : row[0],
                nombre : row[1],
                descripcion: row[2],
                imagen: row[3],
                precio: row[4],
                stock: row[5],
                id_marca: row[6],
                id_inventario: row[7],
                id_categoria: row[8]
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

        const cambioClaveObligatorio = tipo_usuario === 4 ? 'N' : 'S'; // ← Aquí defines la condición

        await cone.execute(
            `INSERT INTO usuario
            (rut_usuario, nombre, primer_apellido, segundo_apellido, cambio_clave_obligatorio, contrasenia, imagen,
             genero, correo, direccion, telefono, fecha_nacimiento, id_tipo_usuario, 
             id_sucursal, id_comuna)
            VALUES(:rut, :nombre, :primer_apellido, :segundo_apellido, :cambio_clave_obligatorio, :contrasenia, :imagen,
                   :genero, :correo, :direccion, :telefono, TO_DATE(:fecha_nacimiento, 'YYYY-MM-DD'),
                   :tipo_usuario, :sucursal, :comuna)`,
            {
                rut,
                nombre,
                primer_apellido,
                segundo_apellido,
                cambio_clave_obligatorio: cambioClaveObligatorio,
                contrasenia: contraseniaEncriptada,
                imagen,
                genero,
                correo,
                direccion,
                telefono,
                fecha_nacimiento,
                tipo_usuario,
                sucursal,
                comuna
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


app.post('/pedido-completo', validarApiKey, async (req, res) => {
  console.log('Pedido recibido:', req.body); 
  const {
    id_pedido, descripcion, total_a_pagar, cantidad, tiene_descuento, fecha_pedido,
    id_sucursal, id_estado_pago, id_estado_pedido, id_entrega, rut_usuario,
    id_pago, monto_total, fecha_pago, id_tipo_pago,imagen,
    productos  // <-- Array con ids de productos
  } = req.body;

  let cone;

  try {
    cone = await oracledb.getConnection(dbConfig);

    // Insertar pedido (sin autoCommit)
    await cone.execute(
      `INSERT INTO pedido
       VALUES(:id_pedido, :descripcion, :total_a_pagar, :cantidad, :tiene_descuento, TO_DATE(:fecha_pedido, 'YYYY-MM-DD'),
              :id_sucursal, :id_estado_pago, :id_estado_pedido, :id_entrega, :rut_usuario)`,
      { id_pedido, descripcion, total_a_pagar, cantidad, tiene_descuento, fecha_pedido,
        id_sucursal, id_estado_pago, id_estado_pedido, id_entrega, rut_usuario }
    );

    // Insertar pago (sin autoCommit)
    await cone.execute(
      `INSERT INTO pago
       (id_pago, monto_total, fecha_pago, id_tipo_pago, rut_usuario, id_pedido,imagen)
       VALUES (:id_pago, :monto_total, TO_DATE(:fecha_pago, 'YYYY-MM-DD'), :id_tipo_pago, :rut_usuario, :id_pedido,:imagen)`,
      { id_pago, monto_total, fecha_pago, id_tipo_pago, rut_usuario, id_pedido,imagen }
    );

    // Insertar detalle pedido para cada producto (sin autoCommit)
    for (const id_producto of productos) {
      await cone.execute(
        `INSERT INTO detalle_pedido (ID_PEDIDO, ID_PRODUCTO) VALUES (:id_pedido, :id_producto)`,
        { id_pedido, id_producto }
      );
    }

    // Commit explícito de toda la transacción
    await cone.commit();

    res.status(201).json({ mensaje: "Pedido, pago y detalle registrados correctamente" });
  } catch (error) {
    if (cone) await cone.rollback(); // rollback si hay error
    res.status(500).json({ error: error.message });
  } finally {
    if (cone) await cone.close();
  }
});
app.get('/pedido-completo/:id', validarApiKey, async (req, res) => {
  const id_pedido = req.params.id;
  let cone;

  try {
    cone = await oracledb.getConnection(dbConfig);

    // 1. Obtener datos del pedido
    const pedidoResult = await cone.execute(
      `SELECT p.ID_PEDIDO, p.DESCRIPCION, p.TOTAL_A_PAGAR, p.CANTIDAD, p.TIENE_DESCUENTO,
              TO_CHAR(p.FECHA_PEDIDO, 'YYYY-MM-DD') AS FECHA_PEDIDO,
              p.ID_SUCURSAL, p.ID_ESTADO_PAGO, p.ID_ESTADO_PEDIDO,
              p.ID_ENTREGA, p.RUT_USUARIO
       FROM PEDIDO p
       WHERE p.ID_PEDIDO = :id`,
      [id_pedido],
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    if (pedidoResult.rows.length === 0) {
      return res.status(404).json({ error: 'Pedido no encontrado' });
    }

    const pedido = pedidoResult.rows[0];

    // 2. Obtener pago del pedido
    const pagoResult = await cone.execute(
      `SELECT ID_PAGO, MONTO_TOTAL, TO_CHAR(FECHA_PAGO, 'YYYY-MM-DD') AS FECHA_PAGO,
              ID_TIPO_PAGO, RUT_USUARIO, IMAGEN
       FROM PAGO
       WHERE ID_PEDIDO = :id`,
      [id_pedido],
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    const pago = pagoResult.rows[0] || null;

    // 3. Obtener detalle del pedido con nombres de productos
    const detalleResult = await cone.execute(
      `SELECT dp.ID_PRODUCTO, pr.NOMBRE
       FROM DETALLE_PEDIDO dp
       JOIN PRODUCTO pr ON dp.ID_PRODUCTO = pr.ID_PRODUCTO
       WHERE dp.ID_PEDIDO = :id`,
      [id_pedido],
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    const detalles = detalleResult.rows;

    // 4. Responder con los datos combinados
    res.json({
      pedido,
      pago,
      detalles
    });

  } catch (error) {
    console.error('Error al obtener el pedido completo:', error);
    res.status(500).json({ error: error.message });
  } finally {
    if (cone) await cone.close();
  }
});

app.get('/pedido-usuario/:rut', validarApiKey, async (req, res) => {
  const rut = req.params.rut;
  let cone;

  try {
    cone = await oracledb.getConnection(dbConfig);

    // 1. Obtener todos los pedidos del usuario
    const pedidosResult = await cone.execute(
      `SELECT p.ID_PEDIDO, p.DESCRIPCION, p.TOTAL_A_PAGAR, p.CANTIDAD, p.TIENE_DESCUENTO,
              TO_CHAR(p.FECHA_PEDIDO, 'YYYY-MM-DD') AS FECHA_PEDIDO,
              p.ID_SUCURSAL, p.ID_ESTADO_PAGO, p.ID_ESTADO_PEDIDO,
              p.ID_ENTREGA, p.RUT_USUARIO
       FROM PEDIDO p
       WHERE p.RUT_USUARIO = :rut`,
      [rut],
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    if (pedidosResult.rows.length === 0) {
      return res.status(404).json({ error: 'No se encontraron pedidos para este usuario' });
    }

    const pedidos = pedidosResult.rows;

    // Para cada pedido, obtener pago y detalles
    const pedidosConDetalles = await Promise.all(pedidos.map(async (pedido) => {
      const pagoResult = await cone.execute(
        `SELECT ID_PAGO, MONTO_TOTAL, TO_CHAR(FECHA_PAGO, 'YYYY-MM-DD') AS FECHA_PAGO,
                ID_TIPO_PAGO, RUT_USUARIO, IMAGEN
         FROM PAGO
         WHERE ID_PEDIDO = :id`,
        [pedido.ID_PEDIDO],
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
      const pago = pagoResult.rows[0] || null;

      const detalleResult = await cone.execute(
        `SELECT dp.ID_PRODUCTO, pr.NOMBRE
         FROM DETALLE_PEDIDO dp
         JOIN PRODUCTO pr ON dp.ID_PRODUCTO = pr.ID_PRODUCTO
         WHERE dp.ID_PEDIDO = :id`,
        [pedido.ID_PEDIDO],
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
      const detalles = detalleResult.rows;

      return {
        pedido,
        pago,
        detalles
      };
    }));

    res.json(pedidosConDetalles);

  } catch (error) {
    console.error('Error al obtener pedidos:', error);
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

    // Obtener contraseña actual si se envía una nueva
    let contraseniaActualHasheada = null;
    if (contrasenia !== undefined && typeof contrasenia === 'string' && contrasenia.trim() !== '') {
      const resultPass = await cone.execute(
        'SELECT contrasenia FROM usuario WHERE rut_usuario = :rut',
        { rut }
      );

      if (resultPass.rows.length === 0) {
        return res.status(404).json({ mensaje: 'Usuario no encontrado' });
      }

      contraseniaActualHasheada = resultPass.rows[0][0];

      const esIgual = await bcrypt.compare(contrasenia, contraseniaActualHasheada);
      if (esIgual) {
        return res.status(400).json({ mensaje: 'La nueva contraseña no puede ser igual a la anterior' });
      }

      valores.contrasenia = await bcrypt.hash(contrasenia, SALT_ROUNDS);
      campos.push('contrasenia = :contrasenia');
      cambioClaveObligatorio = 'N';
    } else if (contrasenia !== undefined) {
      return res.status(400).json({ mensaje: 'Contraseña inválida' });
    }

    // Resto de campos
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
            `SELECT rut_usuario, nombre, id_tipo_usuario, contrasenia, cambio_clave_obligatorio
             FROM usuario 
             WHERE correo = :correo`,
            { correo }
        );

        if (result.rows.length === 0) {
            return res.status(401).json({ error: "El correo no esta registrado" });
        }

        const row = result.rows[0];
        const isMatch = await bcrypt.compare(contrasenia, row[3]);
        if (!isMatch) {
            return res.status(401).json({ error: "La contraseña es incorrecta" });
        }

        const user = {
            rut: row[0],
            nombre: row[1],
            tipoUsuario: row[2],
            cambioClaveObligatorio: row[4] === 'S' && row[2] !== 4 
        };

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
  const mariaHash = await bcrypt.hash('Bodega123.', 10);
  const carlosHash = await bcrypt.hash('Cliente123.', 10);
  const JuanHash = await bcrypt.hash('Contador123.', 10);
  const ElvaHash = await bcrypt.hash('Vendedor123.', 10);

  console.log('Admin:', adminHash);
  console.log('María:', mariaHash);
  console.log('Carlos:', carlosHash);
  console.log('Juan:', JuanHash);
  console.log('Elva:', ElvaHash);
})();
app.listen(puerto,()=>{
    console.log(`API escuchando en puerto ${puerto}`)
})