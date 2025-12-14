require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Client, GatewayIntentBits, REST, Routes } = require('discord.js');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Discord Bot Setup
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// Commands collection
client.commands = new Map();

// Load commands
const commandsPath = path.join(__dirname, 'commands');
if (fs.existsSync(commandsPath)) {
  const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
  
  for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);
    if ('data' in command && 'execute' in command) {
      client.commands.set(command.data.name, command);
      console.log(`[INFO] Loaded command: ${command.data.name}`);
    }
  }
}

// Bot events
client.once('ready', () => {
  console.log(`[BOT] Logged in as ${client.user.tag}`);
  console.log(`[BOT] Serving ${client.guilds.cache.size} guilds`);
});

client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;

  const command = client.commands.get(interaction.commandName);
  if (!command) return;

  try {
    await command.execute(interaction);
  } catch (error) {
    console.error(`[ERROR] Command ${interaction.commandName}:`, error);
    const reply = { content: 'コマンドの実行中にエラーが発生しました。', ephemeral: true };
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(reply);
    } else {
      await interaction.reply(reply);
    }
  }
});

// Login bot
if (process.env.DISCORD_BOT_TOKEN) {
  client.login(process.env.DISCORD_BOT_TOKEN).catch(err => {
    console.error('[ERROR] Bot login failed:', err.message);
  });
}

// API Routes
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    bot: client.user ? {
      username: client.user.username,
      id: client.user.id,
      guilds: client.guilds.cache.size
    } : null
  });
});

app.get('/api/guilds', (req, res) => {
  if (!client.user) {
    return res.status(503).json({ error: 'Bot not ready' });
  }
  
  const guilds = client.guilds.cache.map(guild => ({
    id: guild.id,
    name: guild.name,
    icon: guild.icon,
    memberCount: guild.memberCount
  }));
  
  res.json(guilds);
});

app.get('/api/guilds/:guildId/channels', async (req, res) => {
  try {
    const guild = client.guilds.cache.get(req.params.guildId);
    if (!guild) {
      return res.status(404).json({ error: 'Guild not found' });
    }
    
    const channels = guild.channels.cache
      .filter(ch => ch.isTextBased())
      .map(ch => ({
        id: ch.id,
        name: ch.name,
        type: ch.type,
        position: ch.position
      }))
      .sort((a, b) => a.position - b.position);
    
    res.json(channels);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/channels/:channelId/messages', async (req, res) => {
  try {
    const channel = client.channels.cache.get(req.params.channelId);
    if (!channel) {
      return res.status(404).json({ error: 'Channel not found' });
    }
    
    const limit = parseInt(req.query.limit) || 50;
    const messages = await channel.messages.fetch({ limit });
    
    const formatted = messages.map(msg => ({
      id: msg.id,
      content: msg.content,
      author: {
        id: msg.author.id,
        username: msg.author.username,
        avatar: msg.author.avatar,
        bot: msg.author.bot
      },
      timestamp: msg.createdTimestamp,
      attachments: msg.attachments.map(att => ({
        url: att.url,
        name: att.name
      }))
    })).reverse();
    
    res.json(formatted);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/channels/:channelId/messages', async (req, res) => {
  try {
    const channel = client.channels.cache.get(req.params.channelId);
    if (!channel) {
      return res.status(404).json({ error: 'Channel not found' });
    }
    
    const { content } = req.body;
    if (!content) {
      return res.status(400).json({ error: 'Content required' });
    }
    
    const message = await channel.send(content);
    
    res.json({
      id: message.id,
      content: message.content,
      author: {
        id: message.author.id,
        username: message.author.username,
        avatar: message.author.avatar,
        bot: message.author.bot
      },
      timestamp: message.createdTimestamp
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Serve React app
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`[SERVER] Running on http://localhost:${PORT}`);
  console.log(`[SERVER] Environment: ${process.env.NODE_ENV || 'development'}`);
});
