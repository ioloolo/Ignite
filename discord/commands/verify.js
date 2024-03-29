const {
  MessageEmbed,
  MessageActionRow,
  MessageButton,
  Modal,
  TextInputComponent,
} = require('discord.js');
const { SlashCommandBuilder } = require('@discordjs/builders');

const User = require('../../schema/User');
const logger = require('../../provider/loggerProvider');

module.exports = {
  async execute(interaction) {
    const command = interaction.options.getSubcommand();

    const existUserByDiscordId = await User.findOne({ discordId: interaction.user.id });

    if (existUserByDiscordId) {
      if (existUserByDiscordId.verify)
        await interaction.reply({
          ephemeral: true,
          embeds: [
            new MessageEmbed()
              .setTitle('오류 발생')
              .setDescription(`이미 인증된 계정입니다.`)
              .setColor(0xff5252),
          ],
        });
      else
        await interaction.reply({
          ephemeral: true,
          embeds: [
            new MessageEmbed()
              .setTitle('오류 발생')
              .setDescription(`이미 인증 대기중인 계정입니다.`)
              .setColor(0xff5252),
          ],
        });
    } else {
      if (command === '일반계정' || command === '통합계정') {
        let idComponent;

        if (command === '일반계정') {
          const id = `22-${interaction.options.getInteger('학년')}${String(
            interaction.options.getInteger('반'),
          ).padStart(2, '0')}${String(interaction.options.getInteger('번호')).padStart(2, '0')}`;
          idComponent = new MessageActionRow().addComponents(
            new TextInputComponent()
              .setCustomId('id')
              .setLabel('리로스쿨 아이디')
              .setPlaceholder(id)
              .setValue(id)
              .setStyle('SHORT')
              .setRequired(true),
          );
        } else {
          idComponent = new MessageActionRow().addComponents(
            new TextInputComponent()
              .setCustomId('id')
              .setLabel('리로스쿨 아이디')
              .setPlaceholder('리로스쿨 아이디를 입력해주세요.')
              .setStyle('SHORT')
              .setRequired(true),
          );
        }

        const modal = new Modal()
          .setCustomId('verify_riroschool')
          .setTitle('재학생 인증 - 리로스쿨')
          .addComponents(
            idComponent,
            new MessageActionRow().addComponents(
              new TextInputComponent()
                .setCustomId('pw')
                .setLabel('비밀번호')
                .setPlaceholder('리로스쿨 비밀번호를 입력해주세요.')
                .setStyle('SHORT')
                .setRequired(true),
            ),
          );

        await interaction.showModal(modal);
      } else if (command === '수동') {
        const name = interaction.options.getString('이름');
        const grade = interaction.options.getInteger('학년');
        const clazz = interaction.options.getInteger('반');
        const stdId = interaction.options.getInteger('번호');
        const idCard = interaction.options.getAttachment('학생증');

        const existUser = await User.findOne({ grade, class: clazz, stdId });

        if (existUser)
          if (existUser.verify)
            await interaction.reply({
              ephemeral: true,
              embeds: [
                new MessageEmbed()
                  .setTitle('오류 발생')
                  .setDescription(
                    `해당 학번으로 인증된 계정이 이미 존재합니다.\n<@${existUser.discordId}>`,
                  )
                  .setColor(0xff5252),
              ],
            });
          else
            await interaction.reply({
              ephemeral: true,
              embeds: [
                new MessageEmbed()
                  .setTitle('오류 발생')
                  .setDescription(
                    `해당 학번으로 인증을 기다리는 계정이 이미 존재합니다.\n<@${existUser.discordId}>`,
                  )
                  .setColor(0xff5252),
              ],
            });

        if (!idCard.contentType.startsWith('image/')) {
          await interaction.reply({
            ephemeral: true,
            embeds: [
              new MessageEmbed()
                .setTitle('오류 발생')
                .setDescription(`학생증 사진을 업로드해주세요.`)
                .setColor(0xff5252),
            ],
          });
        } else {
          await new User({
            name,
            grade,
            class: clazz,
            stdId,
            discordId: interaction.user.id,
            verify: false,
          }).save();

          await interaction.reply({
            ephemeral: true,
            embeds: [
              new MessageEmbed()
                .setTitle('인증 대기중')
                .setDescription(`관리자가 확인 후 인증 여부가 결정됩니다.\n잠시만 기다려주세요.`)
                .setColor(0xffcc99),
            ],
          });

          await (
            await interaction.client.channels.fetch(process.env.DISCORD_ADMIN_VERIFY_CHANNEL)
          ).send({
            embeds: [
              new MessageEmbed()
                .setTitle('관리자 인증')
                .setDescription(`<@${interaction.user.id}>`)
                .setColor(0xffff99)
                .addField('이름', name)
                .addField('학년', grade.toString(), true)
                .addField('반', clazz.toString(), true)
                .addField('번호', stdId.toString(), true)
                .addField('디스코드 이름', interaction.user.tag, true)
                .addField('디스코드 아이디', interaction.user.id, true)
                .setImage(idCard.attachment.toString()),
            ],
            components: [
              new MessageActionRow()
                .addComponents(
                  new MessageButton()
                    .setCustomId('manual_verify_approve')
                    .setLabel('승인')
                    .setStyle('SUCCESS'),
                )
                .addComponents(
                  new MessageButton()
                    .setCustomId('manual_verify_reject')
                    .setLabel('거부')
                    .setStyle('DANGER'),
                ),
            ],
          });

          logger.info('유저(%s)가 인증을 요청함.', interaction.user.tag);
        }
      } else if (command === '선생님') {
        const name = interaction.options.getString('이름');
        const grade = interaction.options.getInteger('학년');
        const clazz = interaction.options.getInteger('반');

        await new User({
          name,
          grade,
          class: clazz,
          discordId: interaction.user.id,
          verify: false,
        }).save();

        await interaction.reply({
          ephemeral: true,
          embeds: [
            new MessageEmbed()
              .setTitle('인증 대기중')
              .setDescription(`관리자가 확인 후 인증 여부가 결정됩니다.\n잠시만 기다려주세요.`)
              .setColor(0xffcc99),
          ],
        });

        await (
          await interaction.client.channels.fetch(process.env.DISCORD_ADMIN_VERIFY_CHANNEL)
        ).send({
          embeds: [
            new MessageEmbed()
              .setTitle('관리자 인증 [선생님]')
              .setDescription(`<@${interaction.user.id}>`)
              .setColor(0xffff99)
              .addField('이름', name)
              .addField('디스코드 이름', interaction.user.tag, true)
              .addField('디스코드 아이디', interaction.user.id, true),
          ],
          components: [
            new MessageActionRow()
              .addComponents(
                new MessageButton()
                  .setCustomId('manual_teacher_approve')
                  .setLabel('승인')
                  .setStyle('SUCCESS'),
              )
              .addComponents(
                new MessageButton()
                  .setCustomId('manual_teacher_reject')
                  .setLabel('거부')
                  .setStyle('DANGER'),
              ),
          ],
        });

        logger.info('유저(%s)가 인증을 요청함.', interaction.user.tag);
      }
    }
  },
  data: new SlashCommandBuilder()
    .setName('인증')
    .setDescription('제천고등학교 학생인지 인증합니다.')
    .setDMPermission(false)
    .addSubcommandGroup((commandGroup) =>
      commandGroup
        .setName('자동')
        .setDescription('리로스쿨을 통해 자동으로 인증합니다.')
        .addSubcommand((command) =>
          command
            .setName('일반계정')
            .setDescription('일반적인 경우 이 옵션을 선택하세요.')
            .addIntegerOption((option) =>
              option
                .setName('학년')
                .setDescription('교내 학년')
                .setRequired(true)
                .setMinValue(1)
                .setMaxValue(3),
            )
            .addIntegerOption((option) =>
              option
                .setName('반')
                .setDescription('교내 반')
                .setRequired(true)
                .setMinValue(1)
                .setMaxValue(8),
            )
            .addIntegerOption((option) =>
              option
                .setName('번호')
                .setDescription('교내 번호')
                .setRequired(true)
                .setMinValue(1)
                .setMaxValue(30),
            ),
        )
        .addSubcommand((command) =>
          command.setName('통합계정').setDescription('통합 계정(이메일)을 사용하여 인증합니다.'),
        ),
    )
    .addSubcommand((command) =>
      command
        .setName('수동')
        .setDescription('관리자가 확인 후 승인합니다.')
        .addStringOption((option) =>
          option.setName('이름').setDescription('본명').setRequired(true),
        )
        .addIntegerOption((option) =>
          option
            .setName('학년')
            .setDescription('교내 학년')
            .setRequired(true)
            .setMinValue(1)
            .setMaxValue(3),
        )
        .addIntegerOption((option) =>
          option
            .setName('반')
            .setDescription('교내 반')
            .setRequired(true)
            .setMinValue(1)
            .setMaxValue(8),
        )
        .addIntegerOption((option) =>
          option
            .setName('번호')
            .setDescription('교내 번호')
            .setRequired(true)
            .setMinValue(1)
            .setMaxValue(30),
        )
        .addAttachmentOption((option) =>
          option.setName('학생증').setDescription('학생증').setRequired(true),
        ),
    )
    .addSubcommand((command) =>
      command
        .setName('선생님')
        .setDescription('선생님을 위한 인증입니다.')
        .addStringOption((option) =>
          option.setName('이름').setDescription('본명').setRequired(true),
        ),
    ),
};
