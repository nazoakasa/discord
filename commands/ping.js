const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Botの応答速度を確認します'),
  
  async execute(interaction) {
    const sent = await interaction.reply({ 
      content: 'Pinging...', 
      fetchReply: true 
    });
    
    const latency = sent.createdTimestamp - interaction.createdTimestamp;
    const apiLatency = Math.round(interaction.client.ws.ping);
    
    await interaction.editReply(
      `🏓 Pong!\n` +
      `📡 レイテンシ: ${latency}ms\n` +
      `💓 API レイテンシ: ${apiLatency}ms`
    );
  },
};
