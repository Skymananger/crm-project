import express, { Request, Response } from "express";
import { createServer as createViteServer } from "vite";
import { google } from "googleapis";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.APP_URL ? `${process.env.APP_URL}/auth/google/callback` : 'http://localhost:3000/auth/google/callback'
);

// API: Iniciar Fluxo OAuth Google
app.get("/api/auth/google/url", (req: Request, res: Response) => {
  try {
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
      return res.status(500).json({ 
        error: "Configuração incompleta", 
        message: "GOOGLE_CLIENT_ID ou GOOGLE_CLIENT_SECRET não configurados no servidor." 
      });
    }

    const url = oauth2Client.generateAuthUrl({
      access_type: "offline",
      scope: ["https://www.googleapis.com/auth/calendar.events"],
      prompt: "consent"
    });
    res.json({ url });
  } catch (error: any) {
    res.status(500).json({ error: "Erro interno", message: error.message });
  }
});

// Callback OAuth Google
app.get("/auth/google/callback", async (req: Request, res: Response) => {
  const { code } = req.query;
  try {
    const { tokens } = await oauth2Client.getToken(code as string);
    // Em uma app real, salvaríamos isso no banco vinculado ao usuário.
    // Para este MVP, vamos devolver ao cliente para salvar no localStorage (criptografado se possível)
    res.send(`
      <html>
        <body>
          <script>
            if (window.opener) {
              window.opener.postMessage({ 
                type: 'GOOGLE_AUTH_SUCCESS', 
                tokens: ${JSON.stringify(tokens)} 
              }, '*');
              window.close();
            } else {
              window.location.href = '/';
            }
          </script>
          <p>Autenticação concluída! Fechando janela...</p>
        </body>
      </html>
    `);
  } catch (error) {
    console.error("Erro no callback do Google:", error);
    res.status(500).send("Erro na autenticação.");
  }
});

// API: Criar Evento no Google Calendar
app.post("/api/calendar/event", async (req: Request, res: Response) => {
  const { tokens, event } = req.body;
  if (!tokens) return res.status(401).json({ error: "Não autenticado" });

  try {
    oauth2Client.setCredentials(tokens);
    const calendar = google.calendar({ version: "v3", auth: oauth2Client });
    
    const response = await calendar.events.insert({
      calendarId: "primary",
      requestBody: {
        summary: event.title,
        description: `Cliente: ${event.client}\nEndereço: ${event.address}`,
        start: {
          dateTime: `${event.date}T${event.time}:00`,
          timeZone: "America/Sao_Paulo",
        },
        end: {
          dateTime: `${event.date}T${parseInt(event.time.split(':')[0]) + 1}:${event.time.split(':')[1]}:00`,
          timeZone: "America/Sao_Paulo",
        },
      },
    });

    res.json(response.data);
  } catch (error) {
    console.error("Erro ao criar evento no Google:", error);
    res.status(500).json({ error: "Falha ao sincronizar com Google Agenda" });
  }
});

import { generateRegistrationOptions, verifyRegistrationResponse, generateAuthenticationOptions, verifyAuthenticationResponse } from '@simplewebauthn/server';

// Em um app real, estes valores viriam de um arquivo de configuração ou variáveis de ambiente
const rpID = process.env.RP_ID || 'localhost';
const origin = process.env.APP_URL || 'http://localhost:3000';

// Armazenamento em memória para o desafio (em um app real, use um banco de dados ou sessão)
const challenges = new Map<string, string>();

app.get('/api/auth/biometrics/register-options', async (req, res) => {
  const { email } = req.query;
  if (!email) return res.status(400).json({ error: 'Email é obrigatório' });

  const options = await generateRegistrationOptions({
    rpID,
    rpName: 'SKY Manager',
    userName: email as string,
    attestationType: 'none',
  });

  challenges.set(email as string, options.challenge);

  res.json(options);
});

app.post('/api/auth/biometrics/verify-registration', async (req, res) => {
  const { email } = req.query;
  if (!email) return res.status(400).json({ error: 'Email é obrigatório' });

  try {
    const expectedChallenge = challenges.get(email as string);
    if (!expectedChallenge) return res.status(400).json({ error: 'Desafio não encontrado para este email' });

    const verification = await verifyRegistrationResponse({
      response: req.body,
      expectedChallenge: expectedChallenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
    });

    // Limpar desafio após uso
    challenges.delete(email as string);

    res.json(verification);
  } catch (error) {
    console.error(error);
    res.status(400).json({ error: 'Falha na verificação do registro' });
  }
});

app.get('/api/auth/biometrics/login-options', async (req, res) => {
  const { email } = req.query;
  if (!email) return res.status(400).json({ error: 'Email é obrigatório' });

  const options = await generateAuthenticationOptions({ rpID });
  challenges.set(email as string, options.challenge);
  res.json(options);
});

app.post('/api/auth/biometrics/verify-login', async (req, res) => {
  const { email } = req.query;
  if (!email) return res.status(400).json({ error: 'Email é obrigatório' });

  try {
    const expectedChallenge = challenges.get(email as string);
    if (!expectedChallenge) return res.status(400).json({ error: 'Desafio não encontrado para este email' });

    // Em um app real, você buscaria o autenticador do usuário no banco de dados
    const authenticator = {} as any; // Substituir pela busca no banco

    const verification = await verifyAuthenticationResponse({
      response: req.body,
      expectedChallenge: expectedChallenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      authenticator: authenticator as any,
    } as any);

    // Limpar desafio após uso
    challenges.delete(email as string);

    res.json(verification);
  } catch (error) {
    console.error(error);
    res.status(400).json({ error: 'Falha na verificação do login' });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static("dist"));
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
