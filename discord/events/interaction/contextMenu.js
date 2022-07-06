const { MessageEmbed } = require('discord.js');
const logger = require('../../../provider/loggerProvider');

module.exports = async (client, interaction) => {
  if (interaction.isContextMenu()) {
    const command = client.commands.get(interaction.commandName);

    if (!command) return;

    try {
      await command.execute(interaction);
    } catch (error) {
      logger.error(error.stack);

      try {
        await interaction.fetchReply();

        await interaction.editReply({
          embeds: [
            new MessageEmbed()
              .setTitle('오류 발생')
              .setDescription(error.message)
              .setColor(0xff5252)
              .setTimestamp(new Date()),
          ],
        });
      } catch (e) {
        await interaction.reply({
          embeds: [
            new MessageEmbed()
              .setTitle('오류 발생')
              .setDescription(error.message)
              .setColor(0xff5252)
              .setTimestamp(new Date()),
          ],
        });
      }

      throw error;
    }
  }
};
