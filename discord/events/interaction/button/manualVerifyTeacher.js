const { MessageEmbed } = require('discord.js');
const User = require('../../../../schema/User');
const logger = require('../../../../provider/loggerProvider');
const sendMessage = require('../../../../util/sendMessage');

module.exports = async (client, interaction) => {
  if (interaction.customId.startsWith('manual_teacher')) {
    const name = interaction.message.embeds[0].fields[0].value;
    const discordTag = interaction.message.embeds[0].fields[1].value;
    const discordId = interaction.message.embeds[0].fields[2].value;

    if (interaction.customId === 'manual_teacher_approve') {
      await User.updateOne({ discordId }, { verify: true });

      const member = await interaction.guild.members.fetch(discordId);

      await member.roles.add(process.env.DISCORD_VERIFY_ROLE);
      await member.roles.add(process.env.DISCORD_TEACHER_ROLE);

      try {
        await member.setNickname(`${name} 선생님`);

        // eslint-disable-next-line no-empty
      } catch (e) {}

      await interaction.reply({
        ephemeral: true,
        embeds: [
          new MessageEmbed()
            .setTitle('선생님 인증 허가')
            .setDescription(`${name} 선생님`)
            .addField('담당자', interaction.user.tag, true)
            .setColor(0x7bff7b),
        ],
      });
      await interaction.message.delete();

      await (
        await interaction.guild.members.fetch(discordId)
      ).send({
        embeds: [
          new MessageEmbed()
            .setTitle('선생님 인증 허가')
            .setDescription(`${name} 선생님으로 승인되었습니다.`)
            .addField('담당자', interaction.user.tag, true)
            .setColor(0x7bff7b),
        ],
      });

      await sendMessage.discord.successVerifyTeacherInDM(
        await interaction.guild.members.fetch(discordId),
        name,
      );

      logger.info(
        '관리자(%s)가 유저(%s)[선생님]의 인증을 승인함.',
        interaction.user.tag,
        discordTag,
      );
    } else if (interaction.customId === 'manual_teacher_reject') {
      await User.deleteOne({ discordId });

      await (
        await interaction.guild.members.fetch(discordId)
      ).send({
        embeds: [
          new MessageEmbed()
            .setTitle('선생님 인증 거부')
            .setDescription(`인증이 거부되었습니다.`)
            .addField('인증 방법', '수동 인증', true)
            .addField('담당자', interaction.user.tag, true)
            .setColor(0xff3300),
        ],
      });

      await (
        await interaction.guild.members.fetch(interaction.message.embeds[0].fields[5].value)
      ).kick(`관리자(${interaction.user.tag})가 인증을 거절함.`);

      await interaction.message.delete();

      logger.warn(
        '관리자(%s)가 유저(%s)[선생님]의 인증을 거절함.',
        interaction.user.tag,
        discordTag,
      );
    }
  }
};
