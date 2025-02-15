import type { VoiceState } from "discord.js";
import { ChannelType, Client as BClient, Collection, EmbedBuilder, IntentsBitField, REST } from "discord.js";
import type { CommandCollection } from "$core/handlers/commands/command.type";
import { eventLoad } from "$core/handlers/events/event";
import type { ButtonCollection } from "$core/handlers/buttons";
import { loadButtons } from "$core/handlers/buttons";
import { loadTask } from "$core/handlers/task";
import { setVoice } from "$core/utils/xp/voice/voice.util";
import { sendBotLog } from "$core/utils/discord/webhook/webhook.util";
import { messageConfig } from "$core/config/message";
import { version } from "../package.json";
import { msgParams } from "$core/utils/function/string";
import { colors } from "$core/config/global";
import { Logger } from "$core/utils/logger_new/logger.class";
import { DatabaseManager } from "$core/manager/database/database.manager";
import { CommandManager } from "$core/manager/command/command.manager";
import { ButtonManager } from "$core/manager/button/button.manager";

export class Client extends BClient {

  commands: CommandCollection = new Collection();

  commandManager = new CommandManager(this);

  buttonManager = new ButtonManager(this);

  rest: REST;

  buttons: ButtonCollection = new Collection();

  readonly logger = new Logger("main");

  database = new DatabaseManager(this);

  constructor(token: string) {
    super({
      intents: [
        IntentsBitField.Flags.GuildScheduledEvents,
        IntentsBitField.Flags.Guilds,
        IntentsBitField.Flags.GuildMessages,
        IntentsBitField.Flags.MessageContent,
        IntentsBitField.Flags.DirectMessages,
        IntentsBitField.Flags.GuildMembers,
        IntentsBitField.Flags.GuildVoiceStates,
        IntentsBitField.Flags.GuildPresences,
      ],
    });

    this.rest = new REST({
      version: "10",
    }).setToken(token);

    this.token = token;

    this.on("ready", () => {
      void this.ready();
    });
  }

  async ready(): Promise<void> {
    await eventLoad();
    await this.commandManager.loadCommands();
    await loadButtons();
    await loadTask();
    this.logger.info("the bot is ready");

    for (const guild of this.guilds.cache.values()) {
      const voicesState = guild.voiceStates.cache.values();
      for (const voiceState of voicesState) {
        if (this.validVoiceState(voiceState)) {
          setVoice({
            start: Date.now(),
            guildId: guild.id,
            id: voiceState.member!.user.id,
            deaf: voiceState.deaf || false,
            mute: voiceState.mute || false,
            lastUpdate: Date.now(),
            channelId: voiceState.channel!.id,
          });
        }
      }
    }

    await sendBotLog(new EmbedBuilder()
      .setTitle(messageConfig.logs.ready.readyTitle)
      .setDescription(msgParams(messageConfig.logs.ready.readyDescription, [version]))
      .setColor(colors.success));
  }


  validVoiceState(voiceState: VoiceState): boolean|null {
    return voiceState.channel && voiceState.channel.type === ChannelType.GuildStageVoice && voiceState.member && !voiceState.member.user.bot;
  }

}