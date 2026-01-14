require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const port = process.env.PORT || 3000;

// Configuración de Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

app.use(cors());
app.use(express.json());

// 1. Iniciar Autenticación con Google
app.get('/auth/google', async (req, res) => {
    try {
        const { data, error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: `${req.protocol}://${req.get('host')}/auth/callback`,
            },
        });

        if (error) throw error;

        // Redirigir al usuario a la página de login de Google
        res.redirect(data.url);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 2. Callback de Google (Supabase maneja el intercambio del código por el token)
app.get('/auth/callback', async (req, res) => {
    // Supabase Auth envía los datos en el fragmento (#) de la URL o como query params
    // Para servidores Node, solemos recolectarlos para validar la sesión
    const { code } = req.query;

    if (code) {
        const { data, error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
            return res.status(401).send('Error en la autenticación: ' + error.message);
        }

        // Sesión iniciada con éxito. Redirigir al juego.
        // Podrías pasar el token al frontend aquí si fuera necesario
        return res.redirect(`${process.env.FRONTEND_URL}?auth=success`);
    }

    res.redirect(process.env.FRONTEND_URL);
});

// 3. Obtener Usuario Actual
app.get('/auth/user', async (req, res) => {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) return res.status(401).json({ error: error.message });
    res.json(user);
});

// 4. Salir
app.post('/auth/logout', async (req, res) => {
    const { error } = await supabase.auth.signOut();
    if (error) return res.status(500).json({ error: error.message });
    res.json({ message: 'Sesión cerrada' });
});

app.listen(port, () => {
    console.log(`🚀 Servidor de Autenticación corriendo en http://localhost:${port}`);
    console.log(`🔗 Token Google configurado con Supabase Key: ${supabaseKey.substring(0, 8)}...`);
});
