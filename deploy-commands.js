require('dotenv').config();
const { REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');

const commands = [];
const commandsPath = path.join(__dirname, 'commands');

// Load all command files
if (fs.existsSync(commandsPath)) {
  const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

  for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);
    
    if ('data' in command && 'execute' in command) {
      commands.push(command.data.toJSON());
      console.log(`[LOAD] ${command.data.name}`);
    } else {
      console.log(`[WARN] ${file} is missing required "data" or "execute" property.`);
    }
  }
}

// Deploy commands
const rest = new REST().setToken(process.env.DISCORD_BOT_TOKEN);

(async () => {
  try {
    console.log(`[INFO] Started refreshing ${commands.length} application (/) commands.`);

    // Register commands globally
    const data = await rest.put(
      Routes.applicationCommands(process.env.DISCORD_APP_ID),
      { body: commands },
    );

    console.log(`[SUCCESS] Successfully reloaded ${data.length} application (/) commands.`);
  } catch (error) {
    console.error('[ERROR] Failed to deploy commands:', error);
  }
})();
